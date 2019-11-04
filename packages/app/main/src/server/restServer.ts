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

import { LogService, LogLevel, CommandServiceImpl, CommandServiceInstance, textItem } from '@bfemulator/sdk-shared';
import { createServer, Server, Route } from 'restify';
import CORS from 'restify-cors-middleware';
import { Conversation, ConversationSet } from '@bfemulator/emulator-core';
import { SharedConstants } from '@bfemulator/app-shared';
import { IEndpointService } from 'botframework-config';

import { Emulator } from '../emulator';
import { ServerState } from './state/serverState';
import { mountAllRoutes } from './routes/mountAllRoutes';

interface ConversationAwareRequest extends Request {
  conversation?: { conversationId?: string };
  params?: { conversationId?: string };
}

const cors = CORS({
  origins: ['*'],
  allowHeaders: [
    'authorization',
    'x-requested-with',
    'x-ms-bot-agent',
    'x-emulator-appid',
    'x-emulator-apppassword',
    'x-emulator-botendpoint',
    'x-emulator-channelservice',
  ],
  exposeHeaders: [],
});

let server;
export class EmulatorRestServer {
  @CommandServiceInstance()
  private commandService: CommandServiceImpl;
  private logService: LogService;
  private server: Server;
  private _serverPort: number;
  private _serverUrl: string;
  private state: ServerState;

  public get serverPort(): number {
    return this._serverPort;
  }

  public get serverUrl(): string {
    return this._serverUrl;
  }

  constructor(logService: LogService) {
    // singleton
    if (!server) {
      server = this;
    }
    this.logService = logService;
    this.state = new ServerState();
    return server;
  }

  public async start(port: number): Promise<void> {
    if (this.server) {
      this.server.close();
    }
    try {
      // create server
      await this.createServer();
      // start listening
      await new Promise((resolve, reject) => {
        this.server.once('error', err => reject(err));
        this.server.listen(port, resolve);
      });
      // mount routes
      mountAllRoutes(this.server, this.state);
      this._serverPort = port;
      this._serverUrl = this.server.url;
    } catch (e) {
      if (e.code === 'EADDRINUSE') {
        // do some sort of logging / notification here
        //
        // const notification = newNotification(
        //   `Port ${port} is in use and the Emulator cannot start. Please free this port so the emulator can use it.`
        // );
        // await this.commandService.remoteCall(SharedConstants.Commands.Notifications.Add, notification);
      }
    }
  }

  public close(): Promise<void> {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  public async createServer(): Promise<void> {
    const server = createServer({ name: 'Emulator' });
    server.on('after', this.onAfterRequest);
    server.pre(cors.preflight);
    server.use(cors.actual);
    this.server = server;
  }

  public report(conversationId: string): void {
    this.logService.logToChat(conversationId, textItem(LogLevel.Debug, `Emulator listening on ${this.serverUrl}`));
  }

  private onAfterRequest = (req: Request, res: Response, route: Route, err): void => {
    const conversationId = getConversationId(req as ConversationAwareRequest);
    if (!shouldPostToChat(conversationId, req.method, route, req as any)) {
      return;
    }

    const facility = (req as any).facility || 'network';
    const routeName = (req as any).routeName || '';

    let level = LogLevel.Debug;
    if (!/2\d\d/.test(res.status.toString())) {
      level = LogLevel.Error;
    }

    // emulatorApplication.mainWindow.logService.logToChat(
    //   conversationId,
    //   networkRequestItem(facility, (req as any)._body, req.headers, req.method, req.url),
    //   networkResponseItem((res as any)._data, response.headers, res.statusCode, res.statusMessage, req.url),
    //   textItem(level, `${facility}.${routeName}`)
    // );
  };

  private onNewConversation = async (conversation: Conversation = {} as Conversation) => {
    const { conversationId = '' } = conversation;
    if (!conversationId || conversationId.includes('transcript')) {
      return;
    }
    // Check for an existing livechat window
    // before creating a new one since "new"
    // can also mean "restart".
    const {
      botEndpoint: { id, botUrl },
      mode,
    } = conversation;

    await this.commandService.remoteCall(
      SharedConstants.Commands.Emulator.NewLiveChat,
      {
        id,
        endpoint: botUrl,
      } as IEndpointService,
      // replace this with some other logic that doesn't use this.botEmulator
      hasLiveChat(conversationId, this.botEmulator.facilities.conversations),
      conversationId,
      mode
    );
    this.report(conversationId);
    Emulator.getInstance().ngrok.report(conversationId, botUrl);
  };
}

function shouldPostToChat(
  conversationId: string,
  method: string,
  route: Route,
  req: { body: {}; conversation: Conversation }
): boolean {
  const isDLine = method === 'GET' && route.spec.path === '/v3/directline/conversations/:conversationId/activities';
  const isNotTranscript = !!conversationId && !conversationId.includes('transcript');
  const { conversation } = req;
  return !isDLine && isNotTranscript && conversation && conversation.mode !== 'debug';
}

function getConversationId(req: ConversationAwareRequest): string {
  return req.conversation ? req.conversation.conversationId : req.params.conversationId;
}

function hasLiveChat(conversationId: string, conversationSet: ConversationSet): boolean {
  if (conversationId.endsWith('|livechat')) {
    return !!conversationSet.conversationById(conversationId);
  }
  return !!conversationSet.conversationById(conversationId + '|livechat');
}
