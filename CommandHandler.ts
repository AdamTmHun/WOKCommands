import { Client, Guild } from 'discord.js'
import fs from 'fs'
import WOKCommands from '.'
import Command from './Command'
import getAllFiles from './get-all-files'
import ICommand from './interfaces/ICommand'

class CommandHandler {
  private _commands: Map<String, Command> = new Map()

  constructor(instance: WOKCommands, client: Client, dir: string) {
    if (dir) {
      if (fs.existsSync(dir)) {
        const files = getAllFiles(dir)

        const amount = files.length
        if (amount > 0) {
          console.log(
            `WOKCommands > Loaded ${amount} command${amount === 1 ? '' : 's'}.`
          )

          for (const [file, fileName] of files) {
            this.registerCommand(instance, client, file, fileName)
          }

          client.on('message', (message) => {
            const guild: Guild | null = message.guild
            let content: string = message.content
            const prefix = instance.getPrefix(guild)

            if (content.startsWith(prefix)) {
              // Remove the prefix
              content = content.substring(prefix.length)

              const args = content.split(/ /g)

              // Remove the "command", leaving just the arguments
              const firstElement = args.shift()

              if (firstElement) {
                // Ensure the user input is lower case because it is stored as lower case in the map
                const name = firstElement.toLowerCase()

                const command = this._commands.get(name)
                if (command) {
                  const { minArgs, maxArgs, expectedArgs } = command
                  let { syntaxError = instance.syntaxError } = command

                  // Are the proper number of arguments provided?
                  if (
                    (minArgs !== undefined && args.length < minArgs) ||
                    (maxArgs !== undefined &&
                      maxArgs !== -1 &&
                      args.length > maxArgs)
                  ) {
                    // Replace {PREFIX} with the actual prefix
                    if (syntaxError) {
                      syntaxError = syntaxError.replace(/{PREFIX}/g, prefix)
                    }

                    // Replace {COMMAND} with the name of the command that was ran
                    syntaxError = syntaxError.replace(/{COMMAND}/g, name)

                    // Replace {ARGUMENTS} with the expectedArgs property from the command
                    // If one was not provided then replace {ARGUMENTS} with an empty string
                    syntaxError = syntaxError.replace(
                      / {ARGUMENTS}/g,
                      expectedArgs ? ` ${expectedArgs}` : ''
                    )

                    // Reply with the local or global syntax error
                    message.reply(syntaxError)
                    return
                  }

                  command.execute(message, args)
                }
              }
            }
          })
        }
      } else {
        throw new Error(`Commands directory "${dir}" doesn't exist!`)
      }
    }
  }

  public registerCommand(
    instance: WOKCommands,
    client: Client,
    file: string,
    fileName: string
  ) {
    const configuration = require(file)
    const {
      name = fileName,
      commands,
      aliases,
      callback,
      execute,
      description,
    } = configuration

    if (callback && execute) {
      throw new Error(
        'Commands can have "callback" or "execute" functions, but not both.'
      )
    }

    let names = commands || aliases || []

    if (!name && (!names || names.length === 0)) {
      throw new Error(
        `Command located at "${file}" does not have a name, commands array, or aliases array set. Please set at lease one property to specify the command name.`
      )
    }

    if (typeof names === 'string') {
      names = [names]
    }

    if (name && !names.includes(name.toLowerCase())) {
      names.unshift(name.toLowerCase())
    }

    if (!description) {
      console.warn(
        `WOKCommands > Command "${names[0]}" does not have a "description" property.`
      )
    }

    const hasCallback = callback || execute

    if (hasCallback) {
      const command = new Command(
        instance,
        client,
        names,
        callback || execute,
        configuration
      )

      for (const name of names) {
        // Ensure the alias is lower case because we read as lower case later on
        this._commands.set(name.toLowerCase(), command)
      }
    }
  }

  public get commands(): ICommand[] {
    const results = new Map()

    this._commands.forEach(({ names, description = '' }) => {
      results.set(names[0], {
        names,
        description,
      })
    })

    return Array.from(results.values())
  }
}

export = CommandHandler
