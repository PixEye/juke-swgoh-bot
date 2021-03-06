ALTER TABLE `alliances`
ADD `creation_date` DATE NULL DEFAULT NULL AFTER `name`,
ADD `update_ts` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `creation_date`;

ALTER TABLE `guilds`
ADD `officerCount` INT(1) UNSIGNED NULL DEFAULT NULL AFTER `memberCount`;
