-- phpMyAdmin SQL Dump
-- version 4.8.4
-- https://www.phpmyadmin.net/
--
-- Server version:  5.7.24
-- PHP version:  7.2.14

-- --------------------------------------------------------

--
-- Structure of `guilds`
--

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
-- Structure of `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `allycode` int(11) NOT NULL,
  `discord_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `discord_nickname` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `guildRefId` varchar(16) COLLATE utf8_unicode_ci DEFAULT NULL,
  `gp` int(11) UNSIGNED DEFAULT NULL,
  `g12Count` tinyint(3) UNSIGNED DEFAULT NULL,
  `g13Count` tinyint(3) UNSIGNED DEFAULT NULL,
  `zetaCount` tinyint(3) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `allycode` (`allycode`),
  UNIQUE KEY `discord_id` (`discord_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
