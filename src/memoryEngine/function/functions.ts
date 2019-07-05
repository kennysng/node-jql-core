import { JQLFunction } from '.'

type CreateJQLFunction = () => JQLFunction

/**
 * Supported functions
 */
export const functions: _.Dictionary<CreateJQLFunction> = {
  // TODO
}
