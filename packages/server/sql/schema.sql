-- Pill Arena şeması
-- Kurulum:  mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS pill_arena
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pill_arena;

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(32)     NOT NULL,
  password_hash VARCHAR(255)    NULL,           -- NULL = misafir
  elo           INT             NOT NULL DEFAULT 1000,
  games_played  INT             NOT NULL DEFAULT 0,
  games_won     INT             NOT NULL DEFAULT 0,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username),
  KEY ix_elo (elo DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS matches (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_code    VARCHAR(8)      NOT NULL,
  seed         INT UNSIGNED    NOT NULL,
  config_json  JSON            NOT NULL,
  player_count SMALLINT        NOT NULL,
  started_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at     TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY ix_started (started_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS match_players (
  match_id         BIGINT UNSIGNED NOT NULL,
  user_id          BIGINT UNSIGNED NOT NULL,
  placement        SMALLINT        NOT NULL,
  score            INT             NOT NULL DEFAULT 0,
  viruses_cleared  INT             NOT NULL DEFAULT 0,
  max_chain        SMALLINT        NOT NULL DEFAULT 0,
  survived_frames  INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, user_id),
  KEY ix_user_placement (user_id, placement),
  CONSTRAINT fk_mp_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS elo_history (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  match_id   BIGINT UNSIGNED NOT NULL,
  elo_before INT NOT NULL,
  elo_after  INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_user (user_id, created_at DESC)
) ENGINE=InnoDB;

-- Lider tablosu görünümü
CREATE OR REPLACE VIEW leaderboard AS
SELECT id, username, elo, games_played, games_won,
       ROUND(100 * games_won / GREATEST(games_played, 1), 1) AS win_rate
FROM users
WHERE games_played > 0
ORDER BY elo DESC;
