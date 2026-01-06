import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys"
import Pino from "pino"
import fs from "fs"
import config from "./config.js"

const commands = new Map()

// Load commands
const commandFiles = fs.readdirSync("./commands")
for (const file of commandFiles) {
  const cmd = await import(`./commands/${file}`)
  commands.set(cmd.default.name, cmd.default)
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth")

  const sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        startBot()
      }
    }
    if (connection === "open") {
      console.log("✅ Bot connected")
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const isGroup = from.endsWith("@g.us")
    const sender = msg.key.participant || from
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    if (!body.startsWith(config.prefix)) return

    const args = body.slice(1).trim().split(/ +/)
    const commandName = args.shift().toLowerCase()

    const command = commands.get(commandName)
    if (!command) return

    try {
      await command.execute({
        sock,
        msg,
        from,
        sender,
        args,
        isGroup,
        config
      })
    } catch (err) {
      await sock.sendMessage(from, { text: "❌ Error running command" })
    }
  })
}

startBot()
