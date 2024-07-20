-- phpMyAdmin SQL Dump
-- version 4.8.4
-- https://www.phpmyadmin.net/
--
-- Host:  127.0.0.1:3306
-- Generated on:  jeu. 04 nov. 2021 à 15:51
-- Version du server:  5.7.24
-- Version de PHP:  7.2.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------

--
-- Structure of table `alliances`
--

CREATE TABLE IF NOT EXISTS `alliances` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `creation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `update_ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `name` (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `current_ga`
--

DROP TABLE IF EXISTS `current_ga`;
CREATE TABLE IF NOT EXISTS `current_ga` (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `allycode` int(4) UNSIGNED NOT NULL,
  `division` tinyint(1) UNSIGNED NOT NULL DEFAULT '10',
  `type` tinyint(1) UNSIGNED NOT NULL DEFAULT '5',
  `round` tinyint(1) UNSIGNED NOT NULL DEFAULT '0',
  `ground_territory` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `fleet_territory` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `result` tinyint(1) UNSIGNED NOT NULL DEFAULT '0',
  `opponent_score` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `score` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `total_score` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `gl_faced` tinyint(1) UNSIGNED NOT NULL DEFAULT '0',
  `auto_def` tinyint(1) UNSIGNED NOT NULL DEFAULT '0',
  `defensive_win` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `undersize_win` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `total_defensive_win` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `total_undersize_win` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `allycode` (`allycode`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `evols`
--

CREATE TABLE IF NOT EXISTS `evols` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `allycode` int(4) UNSIGNED NOT NULL,
  `unit_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `new_value` int(4) UNSIGNED NOT NULL,
  `type` varchar(15) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `allycode` (`allycode`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `guilds`
--

CREATE TABLE IF NOT EXISTS `guilds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `swgoh_id` varchar(16) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(60) COLLATE utf8_unicode_ci NOT NULL,
  `gp` int(4) UNSIGNED NOT NULL,
  `memberCount` tinyint(1) UNSIGNED NOT NULL DEFAULT '0',
  `officerCount` int(1) UNSIGNED DEFAULT NULL,
  `gm_allycode` int(4) UNSIGNED DEFAULT NULL,
  `alliance_id` int(10) UNSIGNED DEFAULT NULL,
  `ts` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `swgoh_id` (`swgoh_id`),
  KEY `name` (`name`),
  KEY `alliance_id` (`alliance_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `tw_results`
--

CREATE TABLE IF NOT EXISTS `tw_results` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `discord_id` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `allycode` int(4) UNSIGNED NOT NULL,
  `self_guild_id` varchar(15) COLLATE utf8_unicode_ci DEFAULT NULL,
  `self_guild_name` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL,
  `self_player_cnt` int(1) UNSIGNED NOT NULL,
  `self_score` int(4) NOT NULL,
  `opp_score` int(4) NOT NULL,
  `opp_name` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `self_guild_id` (`self_guild_id`),
  KEY `allycode` (`allycode`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `units`
--

CREATE TABLE IF NOT EXISTS `units` (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `allycode` int(4) UNSIGNED NOT NULL,
  `name` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `combatType` tinyint(1) UNSIGNED NOT NULL DEFAULT '1',
  `gear` tinyint(1) UNSIGNED DEFAULT NULL,
  `relic` tinyint(1) UNSIGNED DEFAULT NULL,
  `stars` tinyint(1) DEFAULT NULL,
  `zetaCount` tinyint(1) UNSIGNED DEFAULT NULL,
  `gp` int(4) UNSIGNED DEFAULT NULL,
  `ts` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ACAndUnitName` (`allycode`,`name`),
  KEY `allycode` (`allycode`),
  KEY `combatType` (`combatType`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `unitNames`
--

DROP TABLE IF EXISTS `unitNames`;
CREATE TABLE IF NOT EXISTS `unitNames` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
COMMIT;

-- --------------------------------------------------------

--
-- Structure of table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `allycode` int(4) UNSIGNED NOT NULL,
  `discord_id` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `discord_name` varchar(32) COLLATE utf8_unicode_ci DEFAULT NULL,
  `game_name` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `guildRefId` varchar(16) COLLATE utf8_unicode_ci DEFAULT NULL,
  `gp` int(4) UNSIGNED DEFAULT NULL,
  `g12Count` tinyint(1) UNSIGNED DEFAULT NULL,
  `g13Count` tinyint(1) UNSIGNED DEFAULT NULL,
  `giftCount` int(4) UNSIGNED NOT NULL DEFAULT '0',
  `zetaCount` tinyint(1) UNSIGNED DEFAULT NULL,
  `contestPoints` int(4) NOT NULL DEFAULT '0',
  `isContestAdmin` tinyint(1) NOT NULL DEFAULT '0',
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `warnLevel` tinyint(1) UNSIGNED NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `allycode` (`allycode`) USING BTREE,
  KEY `discord_id` (`discord_id`) USING BTREE,
  KEY `guildRefId` (`guildRefId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

ALTER TABLE `users`
 ADD `glCount`
  INT UNSIGNED NULL DEFAULT NULL AFTER `giftCount`,
 ADD `omicronCount`
  INT UNSIGNED NULL DEFAULT NULL AFTER `glCount`,
 ADD `banned`
  BOOLEAN NOT NULL DEFAULT FALSE AFTER `allycode`;

ALTER TABLE `units`
 ADD `omicronCount`
  TINYINT UNSIGNED NULL DEFAULT NULL AFTER `stars`;
