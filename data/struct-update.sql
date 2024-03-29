ALTER TABLE `alliances`
ADD `creation_date` DATE NULL DEFAULT NULL AFTER `name`,
ADD `update_ts` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `creation_date`;

ALTER TABLE `guilds`
ADD `officerCount` INT(1) UNSIGNED NULL DEFAULT NULL AFTER `memberCount`;

ALTER TABLE `users` CHANGE `g12Count` `g12Count` INT(4) UNSIGNED NULL DEFAULT NULL;
ALTER TABLE `users` CHANGE `g13Count` `g13Count` INT(4) UNSIGNED NULL DEFAULT NULL;
ALTER TABLE `users` CHANGE `zetaCount` `zetaCount` INT(4) UNSIGNED NULL DEFAULT NULL;

ALTER TABLE `users` CHANGE `guildRefId` `guildRefId`
 VARCHAR(25) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL;
ALTER TABLE `guilds` CHANGE `swgoh_id` `swgoh_id`
 VARCHAR(25) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL;

ALTER TABLE `guilds` ADD UNIQUE(`name`);

ALTER TABLE `tw_results` CHANGE `self_guild_id` `self_guild_id`
 VARCHAR(25) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL;

ALTER TABLE `users` ADD INDEX(`banned`);
