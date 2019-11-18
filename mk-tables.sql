-- phpMyAdmin SQL Dump
-- version 4.8.4
-- https://www.phpmyadmin.net/
--
-- Version du serveur :  5.7.24
-- Version de PHP :  7.2.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------

--
-- Structure of table `evols`
--

DROP TABLE IF EXISTS `evols`;
CREATE TABLE IF NOT EXISTS `evols` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `allycode` int(10) UNSIGNED NOT NULL,
  `unit_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(5) COLLATE utf8_unicode_ci NOT NULL,
  `new_value` tinyint(1) UNSIGNED NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `guilds`
--

DROP TABLE IF EXISTS `guilds`;
CREATE TABLE IF NOT EXISTS `guilds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `swgoh_id` varchar(16) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(64) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `swgoh_id` (`swgoh_id`),
  KEY `name` (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `units`
--

DROP TABLE IF EXISTS `units`;
CREATE TABLE IF NOT EXISTS `units` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `allycode` int(10) UNSIGNED NOT NULL,
  `name` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `combatType` tinyint(1) UNSIGNED DEFAULT NULL,
  `gear` tinyint(1) UNSIGNED DEFAULT NULL,
  `relic` tinyint(1) UNSIGNED DEFAULT NULL,
  `zetaCount` tinyint(1) UNSIGNED DEFAULT NULL,
  `gp` int(10) UNSIGNED DEFAULT NULL,
  `ts` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `playerUnitId` (`allycode`,`name`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure of table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `allycode` int(11) NOT NULL,
  `discord_id` varchar(32) COLLATE utf8_unicode_ci DEFAULT NULL,
  `discord_name` varchar(32) COLLATE utf8_unicode_ci DEFAULT NULL,
  `game_name` varchar(32) COLLATE utf8_unicode_ci DEFAULT NULL,
  `guildRefId` varchar(16) COLLATE utf8_unicode_ci DEFAULT NULL,
  `gp` int(11) UNSIGNED DEFAULT NULL,
  `g12Count` tinyint(1) UNSIGNED DEFAULT NULL,
  `g13Count` tinyint(1) UNSIGNED DEFAULT NULL,
  `zetaCount` tinyint(1) UNSIGNED DEFAULT NULL,
  `ts` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `allycode` (`allycode`) USING BTREE,
  KEY `discord_id` (`discord_id`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
COMMIT;
