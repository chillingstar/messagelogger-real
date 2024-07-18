const { Client } = require('discord.js-selfbot-v13');
const mysql = require('mysql2/promise');
require('dotenv').config();

const client = new Client();
let connection;

async function initializeDatabase() {
    connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
}

initializeDatabase().catch(error => console.error('Error connecting to database:', error));

async function createDailyTable() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const tableName = `${year}-${month}-${day}`;

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS \`${tableName}\`
        (
            status          VARCHAR(255) NOT NULL DEFAULT '0',
            id              BIGINT AUTO_INCREMENT PRIMARY KEY,
            author          VARCHAR(255) NOT NULL,
            content         TEXT         NOT NULL,
            isChannel       BOOLEAN      NOT NULL,
            channel         VARCHAR(255),
            server          VARCHAR(255),
            timestamp       BIGINT      NOT NULL,
            isDirectMessage BOOLEAN      NOT NULL
        )
    `;

    await connection.query(createTableQuery);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (!message || !message.id) {
        console.error('Received invalid message object:', message);
        return;
    }

    createDailyTable();

    const status = 0;
    const author = message.author.id;
    const content = message.content;
    const isChannel = message.channel.type === 'GUILD_TEXT';
    const channel = message.channel.id || null;
    const server = message.guild ? message.guild.id : null;
    const timestamp = message.createdTimestamp;
    const isDirectMessage = message.channel.type === 'DM';

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const tableName = `${year}-${month}-${day}`;

    const insertMessageQuery = `
        INSERT INTO \`${tableName}\` (status, author, content, isChannel, channel, server, timestamp, isDirectMessage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await connection.query(insertMessageQuery, [status, author, content, isChannel, channel, server, timestamp, isDirectMessage]);
    } catch (error) {
        console.error('Error creating message:', error);
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage || !newMessage.id) {
        console.error('Received invalid newMessage object:', newMessage);
        return;
    }

    createDailyTable();

    const status = 1;
    const id = newMessage.id;
    const author = newMessage.author.id;
    const content = newMessage.content;
    const isChannel = newMessage.channel.type === 'GUILD_TEXT';
    const channel = newMessage.channel.id || null;
    const server = newMessage.guild ? newMessage.guild.id : null;
    const timestamp = newMessage.createdTimestamp;
    const isDirectMessage = newMessage.channel.type === 'DM';

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const tableName = `${year}-${month}-${day}`;

    const insertMessageQuery = `
        INSERT INTO \`${tableName}\` (status, id, author, content, isChannel, channel, server, timestamp, isDirectMessage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            status = VALUES(status),
            author = VALUES(author),
            content = VALUES(content),
            isChannel = VALUES(isChannel),
            channel = VALUES(channel),
            server = VALUES(server),
            timestamp = VALUES(timestamp),
            isDirectMessage = VALUES(isDirectMessage)
    `;

    try {
        await connection.query(insertMessageQuery, [status, id, author, content, isChannel, channel, server, timestamp, isDirectMessage]);
    } catch (error) {
        console.error('Error updating message:', error);
    }
});

client.on('messageDelete', async (message) => {
    if (!message || !message.id) {
        console.error('Received invalid message object:', message);
        return;
    }

    createDailyTable();

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const tableName = `${year}-${month}-${day}`;

    const status = 2;
    const id = message.id;

    const getMessageQuery = `
        SELECT *
        FROM \`${tableName}\`
        WHERE id = ?
    `;
    const updateMessageQuery = `
        UPDATE \`${tableName}\`
        SET status = ?
        WHERE id = ?
    `;
    try {
        const [rows] = await connection.query(getMessageQuery, [id]);
        if (rows.length) {
            await connection.query(updateMessageQuery, [status, id]);
        }
    } catch (error) {
        console.error('Error deleting message:', error);
    }
});

client.login(process.env.TOKEN);
