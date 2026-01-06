export default {
  name: "menu",
  async execute({ sock, from, config }) {
    const text = `
🤖 *${config.botName}*

📌 Commands:
!menu
!ping
!owner

✨ More features coming soon
`
    await sock.sendMessage(from, { text })
  }
}
