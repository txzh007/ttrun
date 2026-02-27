#![allow(non_snake_case)]

use std::net::{IpAddr, SocketAddr};
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use hmac::{Hmac, Mac};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use sha1::Sha1;
use tokio::net::UdpSocket;
use tokio::runtime::Runtime;
use turn::relay::relay_range::RelayAddressGeneratorRanges;
use turn::auth::{generate_auth_key, AuthHandler};
use turn::relay::relay_static::RelayAddressGeneratorStatic;
use turn::server::config::{ConnConfig, ServerConfig};
use turn::server::Server;
use turn::Error as TurnError;
use util::vnet::net::Net;

type HmacSha1 = Hmac<Sha1>;

#[napi(object)]
#[allow(non_snake_case)]
pub struct NativeServiceOptions {
  pub realm: String,
  pub authSecret: String,
  pub listenPort: u16,
  pub minPort: Option<u16>,
  pub maxPort: Option<u16>,
  pub publicIp: String,
  pub listeningIp: String,
  pub username: Option<String>,
  pub password: Option<String>,
  pub disableCredentialExpiry: Option<bool>,
}

#[napi(object)]
#[allow(non_snake_case)]
pub struct NativeCredential {
  pub username: String,
  pub password: String,
  pub ttlSec: u32,
  pub expiresAt: u32,
}

#[napi(object)]
pub struct Health {
  pub running: bool,
}

struct SecretAuthHandler {
  secret: String,
  disable_credential_expiry: bool,
  static_username: Option<String>,
  static_password: Option<String>,
}

impl AuthHandler for SecretAuthHandler {
  fn auth_handle(
    &self,
    username: &str,
    realm: &str,
    _src_addr: SocketAddr,
  ) -> std::result::Result<Vec<u8>, TurnError> {
    if let Some(static_password) = &self.static_password {
      if let Some(static_username) = &self.static_username {
        if username != static_username {
          return Err(TurnError::ErrFakeErr);
        }
      }
      return Ok(generate_auth_key(username, realm, static_password));
    }

    if !self.disable_credential_expiry && !username_is_fresh(username) {
      return Err(TurnError::ErrFakeErr);
    }

    let password = hmac_password_for_turn(&self.secret, username);
    Ok(generate_auth_key(username, realm, &password))
  }
}

#[napi]
pub struct NativeTurnService {
  options: NativeServiceOptions,
  runtime: Runtime,
  server: Option<Server>,
}

#[napi]
impl NativeTurnService {
  #[napi(constructor)]
  pub fn new(options: NativeServiceOptions) -> Result<Self> {
    if options.realm.is_empty() {
      return Err(Error::new(Status::InvalidArg, "realm is required".to_string()));
    }
    if options.authSecret.is_empty() && options.password.as_deref().unwrap_or("").is_empty() {
      return Err(Error::new(
        Status::InvalidArg,
        "authSecret or password is required".to_string(),
      ));
    }

    let runtime = Runtime::new().map_err(to_napi_err)?;

    Ok(Self {
      options,
      runtime,
      server: None,
    })
  }

  #[napi]
  pub fn start(&mut self, _detached: Option<bool>) -> Result<()> {
    if self.server.is_some() {
      return Ok(());
    }

    let bind_ip = self.options.listeningIp.clone();
    let listen_port = self.options.listenPort;
    let public_ip = self.options.publicIp.clone();
    let realm = self.options.realm.clone();
    let secret = self.options.authSecret.clone();
    let static_username = self.options.username.clone().filter(|v| !v.is_empty());
    let static_password = self.options.password.clone().filter(|v| !v.is_empty());
    let disable_credential_expiry = resolve_disable_credential_expiry(self.options.disableCredentialExpiry, static_password.is_some());
    let min_port = self.options.minPort;
    let max_port = self.options.maxPort;

    if let Err(message) = validate_port_range(min_port, max_port) {
      return Err(Error::new(Status::InvalidArg, message));
    }

    let server = self.runtime.block_on(async move {
      let conn = Arc::new(UdpSocket::bind(format!("{}:{}", bind_ip, listen_port)).await?);
      let relay_ip = IpAddr::from_str(&public_ip)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?;
      let net = Arc::new(Net::new(None));

      let relay_addr_generator: Box<dyn turn::relay::RelayAddressGenerator + Send + Sync> =
        match (min_port, max_port) {
          (Some(min), Some(max)) => Box::new(RelayAddressGeneratorRanges {
            relay_address: relay_ip,
            min_port: min,
            max_port: max,
            max_retries: 0,
            address: bind_ip.clone(),
            net: net.clone(),
          }),
          _ => Box::new(RelayAddressGeneratorStatic {
            relay_address: relay_ip,
            address: bind_ip.clone(),
            net,
          }),
        };

      let cfg = ServerConfig {
        conn_configs: vec![ConnConfig {
          conn,
          relay_addr_generator,
        }],
        realm,
        auth_handler: Arc::new(SecretAuthHandler {
          secret,
          disable_credential_expiry,
          static_username,
          static_password,
        }),
        channel_bind_timeout: Duration::from_secs(0),
        alloc_close_notify: None,
      };

      Server::new(cfg).await
    });

    self.server = Some(server.map_err(to_napi_err)?);
    Ok(())
  }

  #[napi]
  pub fn stop(&mut self) -> Result<()> {
    if let Some(server) = self.server.take() {
      self.runtime.block_on(async move { server.close().await }).map_err(to_napi_err)?;
    }
    Ok(())
  }

  #[napi(js_name = "issueCredential")]
  pub fn issue_credential(
    &self,
    ttl_sec: Option<u32>,
    user_id: Option<String>,
    username: Option<String>,
  ) -> Result<NativeCredential> {
    let static_password = self.options.password.clone().filter(|v| !v.is_empty());
    let static_username = self.options.username.clone().filter(|v| !v.is_empty());
    let disable_credential_expiry = resolve_disable_credential_expiry(self.options.disableCredentialExpiry, static_password.is_some());
    let ttl = ttl_sec.unwrap_or(3600).max(60);
    let expires_at = if disable_credential_expiry {
      0
    } else {
      now_unix() + ttl
    };
    let username = if static_password.is_some() {
      static_username.unwrap_or_else(|| build_username(username, user_id, expires_at, disable_credential_expiry))
    } else {
      build_username(username, user_id, expires_at, disable_credential_expiry)
    };
    let password = match static_password {
      Some(value) => value,
      None => hmac_password(&self.options.authSecret, &username)?,
    };

    Ok(NativeCredential {
      username,
      password,
      ttlSec: if disable_credential_expiry { 0 } else { ttl },
      expiresAt: expires_at,
    })
  }

  #[napi(js_name = "getIceUrls")]
  pub fn get_ice_urls(&self) -> Vec<String> {
    build_ice_urls(&self.options.publicIp, self.options.listenPort)
  }

  #[napi]
  pub fn health(&self) -> Health {
    Health {
      running: self.server.is_some(),
    }
  }
}

impl Drop for NativeTurnService {
  fn drop(&mut self) {
    if let Some(server) = self.server.take() {
      let _ = self.runtime.block_on(async move { server.close().await });
    }
  }
}

fn build_username(
  username: Option<String>,
  user_id: Option<String>,
  expires_at: u32,
  disable_credential_expiry: bool,
) -> String {
  if disable_credential_expiry {
    if let Some(raw) = username {
      if !raw.is_empty() {
        return raw;
      }
    }

    return match user_id {
      Some(user) if !user.is_empty() => user,
      _ => "tturn-user".to_string(),
    };
  }

  if let Some(raw) = username {
    if !raw.is_empty() {
      if username_is_fresh(&raw) {
        return raw;
      }
      return format!("{}:{}", raw, expires_at);
    }
  }

  match user_id {
    Some(user) if !user.is_empty() => format!("{}:{}", user, expires_at),
    _ => expires_at.to_string(),
  }
}

fn now_unix() -> u32 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_secs() as u32
}

fn username_is_fresh(username: &str) -> bool {
  let ts = username.rsplit(':').next().unwrap_or(username);
  let Ok(exp) = ts.parse::<u32>() else {
    return false;
  };
  exp > now_unix()
}

fn hmac_password_for_turn(secret: &str, username: &str) -> String {
  let mut mac = HmacSha1::new_from_slice(secret.as_bytes())
    .expect("auth secret bytes are always valid for hmac");
  mac.update(username.as_bytes());
  BASE64.encode(mac.finalize().into_bytes())
}

fn hmac_password(secret: &str, username: &str) -> Result<String> {
  let mut mac = HmacSha1::new_from_slice(secret.as_bytes())
    .map_err(|_| Error::new(Status::GenericFailure, "invalid auth secret".to_string()))?;
  mac.update(username.as_bytes());
  Ok(BASE64.encode(mac.finalize().into_bytes()))
}

fn to_napi_err<E: std::fmt::Display>(error: E) -> Error {
  Error::new(Status::GenericFailure, error.to_string())
}

fn validate_port_range(min_port: Option<u16>, max_port: Option<u16>) -> std::result::Result<(), String> {
  match (min_port, max_port) {
    (None, None) => Ok(()),
    (Some(min), Some(max)) => {
      if min == 0 || max == 0 || max < min {
        return Err("invalid relay port range (minPort/maxPort)".to_string());
      }
      Ok(())
    }
    _ => Err("minPort and maxPort must be provided together".to_string()),
  }
}

fn build_ice_urls(public_ip: &str, listen_port: u16) -> Vec<String> {
  vec![format!("turn:{}:{}?transport=udp", public_ip, listen_port)]
}

fn resolve_disable_credential_expiry(config_value: Option<bool>, has_static_password: bool) -> bool {
  config_value.unwrap_or(true) || has_static_password
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn rejects_partial_port_range() {
    assert!(validate_port_range(Some(50000), None).is_err());
    assert!(validate_port_range(None, Some(51000)).is_err());
  }

  #[test]
  fn accepts_empty_or_complete_valid_port_range() {
    assert!(validate_port_range(None, None).is_ok());
    assert!(validate_port_range(Some(50000), Some(51000)).is_ok());
  }

  #[test]
  fn generates_udp_only_ice_url() {
    let urls = build_ice_urls("1.2.3.4", 3478);
    assert_eq!(urls, vec!["turn:1.2.3.4:3478?transport=udp".to_string()]);
  }

  #[test]
  fn default_credential_expiry_is_disabled() {
    assert!(resolve_disable_credential_expiry(None, false));
  }

  #[test]
  fn explicit_false_keeps_static_password_non_expiring() {
    assert!(resolve_disable_credential_expiry(Some(false), true));
  }
}
