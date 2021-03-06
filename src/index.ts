import { Client } from 'discord.js';

import db_config from '../database.json';
import { commandPrefix, discordToken, cooldown } from '../config.json';
import { get_commands_in, find_command } from './command';
import path from 'path';
import { help } from './help';
import { PoolWrapper } from './db';
import { enableGhostPingDetection } from './ghostPingDetection';
import { dealWithPossibleSubmission } from './hiddenSubmissionTrigger';

const client = new Client();

(async () => {
    const cooldowns = new Set<string>();
    const commands = await get_commands_in(path.join(__dirname, 'commands'));
    const db = new PoolWrapper(db_config.dev);

    client.on('message', async (message) => {
        if (!dealWithPossibleSubmission(message, db)) {
            return;
        }
        if (!message.content.startsWith(commandPrefix)) return;

        console.log(cooldowns);
        if (cooldowns.has(message.author.id)) return;

        cooldowns.add(message.author.id);
        setTimeout(() => {
            console.log('run delete');
            cooldowns.delete(message.author.id);
        }, cooldown * 10000 + 1);

        const messageArray = message.content.split(' ');
        const cmd = messageArray[0].replace('~', '');
        const args = messageArray.slice(1);
        console.log(cmd, cmd == 'help');
        const create_params = { args, client, db, message };
        if (cmd == 'help') {
            await help(create_params, commands);
            return;
        }

        const command = find_command(cmd, commands);

        if (await command?.check(create_params)) {
            const res = await command?.run(create_params);
            if (res) {
                message.channel.send(res);
            }
        }
    });
    enableGhostPingDetection(client);
    client.login(discordToken);
})();
