import { Client, Message } from 'discord.js'
import WOKCommands from '..'
import commandStatus from '../modles/disabled-commands'

export = {
  minArgs: 2,
  maxArgs: 2,
  expectedArgs: '<"enable" or "disable"> <Command Name>',
  callback: async (
    message: Message,
    args: string[],
    text: string,
    client: Client,
    prefix: string,
    instance: WOKCommands
  ) => {
    const newState = args.shift()?.toLowerCase()
    const name = args.shift()?.toLowerCase()

    if (newState !== 'enable' && newState !== 'disable') {
      message.reply('The state must either be "enable" or "disable"')
      return
    }

    const { guild } = message
    if (!guild) {
      message.reply('You cannot enable or disable commands in private messages')
      return
    }

    for (const { names } of instance.commands) {
      // @ts-ignore
      if (names.includes(name)) {
        const mainCommand = names[0]
        const isDisabled = instance.commandHandler.isCommandDisabled(
          guild.id,
          mainCommand
        )

        if (newState === 'enable') {
          if (!isDisabled) {
            message.reply('That command is already enabled!')
            return
          }

          await commandStatus.deleteOne({
            guildId: guild.id,
            command: mainCommand,
          })

          instance.commandHandler.enableCommand(guild.id, mainCommand)

          message.reply(`"${mainCommand}" is now enabled!`)
        } else {
          if (isDisabled) {
            message.reply('That command is already disabled!')
            return
          }

          await new commandStatus({
            guildId: guild.id,
            command: mainCommand,
          }).save()

          instance.commandHandler.disableCommand(guild.id, mainCommand)

          message.reply(`"${mainCommand}" is now disabled!`)
        }

        return
      }
    }

    message.reply(
      `Could not find command "${name}"! View all commands with "${instance.getPrefix(
        guild
      )}help"`
    )
  },
}
