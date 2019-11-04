//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { NgrokService } from './ngrokService';
import { EmulatorRestServer } from './server/restServer';

let emulator: EmulatorNew;
class SingletonEnforcer {}
/**
 * Top-level state container for the Node process.
 */
export class EmulatorNew {
  public ngrok = new NgrokService();
  public server = new EmulatorRestServer(undefined); // undefined = some log service

  private constructor(enforcer: SingletonEnforcer) {
    if (!(enforcer instanceof SingletonEnforcer)) {
      throw new Error('Emulator is a singleton. Please use Emulator.getInstance()');
    }
  }

  public static getInstance() {
    return emulator || (emulator = new EmulatorNew(new SingletonEnforcer()));
  }
  /**
   * Loads settings from disk and then creates the emulator.
   */
  public async startup(port) {
    await this.framework.recycle(port);
  }

  public async report(conversationId: string, botUrl: string): Promise<void> {
    this.framework.report(conversationId);
    await this.ngrok.report(conversationId, botUrl);
  }
}
