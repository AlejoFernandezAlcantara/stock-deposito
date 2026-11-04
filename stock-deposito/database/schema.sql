-- =====================================================================
-- Control de stock de depósito - Esquema MySQL (8.0.16+ por los CHECK)
-- =====================================================================
CREATE DATABASE IF NOT EXISTS stock_deposito
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stock_deposito;

-- Productos / elementos del depósito -----------------------------------
-- total_quantity     : unidades que posee el depósito (dentro + fuera)
-- available_quantity : unidades físicamente en el depósito (se descuenta
--                      en cada retiro y se repone en cada devolución)
CREATE TABLE IF NOT EXISTS items (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name               VARCHAR(150) NOT NULL,
  category           VARCHAR(100) NOT NULL,
  total_quantity     INT UNSIGNED NOT NULL DEFAULT 0,
  available_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_name_category (name, category),
  KEY idx_items_category (category),
  CONSTRAINT chk_items_available CHECK (available_quantity <= total_quantity)
) ENGINE=InnoDB;

-- Observaciones de estado con cantidad (ej.: "5 sin cable") --------------
CREATE TABLE IF NOT EXISTS item_observations (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id     INT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity    INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_obs_item (item_id),
  CONSTRAINT fk_obs_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
  CONSTRAINT chk_obs_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

-- Retiros (historial completo) ------------------------------------------
-- status = RETIRADO mientras returned_quantity < quantity
-- status = DEVUELTO cuando returned_quantity = quantity
CREATE TABLE IF NOT EXISTS withdrawals (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id           INT UNSIGNED NOT NULL,
  quantity          INT UNSIGNED NOT NULL,
  returned_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  withdrawal_date   DATE NOT NULL,
  destination       VARCHAR(200) NOT NULL,
  reason            VARCHAR(500) NULL,
  status            ENUM('RETIRADO','DEVUELTO') NOT NULL DEFAULT 'RETIRADO',
  returned_at       DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wd_item (item_id),
  KEY idx_wd_status_date (status, withdrawal_date),
  CONSTRAINT fk_wd_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE RESTRICT,
  CONSTRAINT chk_wd_quantity CHECK (quantity > 0),
  CONSTRAINT chk_wd_returned CHECK (returned_quantity <= quantity)
) ENGINE=InnoDB;

-- Datos de ejemplo (opcional) -------------------------------------------
INSERT IGNORE INTO items (id, name, category, total_quantity, available_quantity) VALUES
  (1, 'Teclado', 'Periféricos', 25, 25),
  (2, 'CPU', 'Computadoras', 12, 12);
INSERT IGNORE INTO item_observations (id, item_id, description, quantity) VALUES
  (1, 1, 'Sin cable', 5),
  (2, 1, 'A limpiar', 5);
