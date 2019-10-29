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

import { ResourceResponse } from '@bfemulator/sdk-shared';
import { Activity } from 'botframework-schema';
import * as HttpStatus from 'http-status-codes';
import * as Restify from 'restify';
import { Server } from 'ws';

import { BotEmulator } from '../../botEmulator';
import OAuthLinkEncoder from '../../utils/oauthLinkEncoder';
import sendErrorResponse from '../../utils/sendErrorResponse';
import ConversationAPIPathParameters from '../conversationAPIPathParameters';

export default function replyToActivity(botEmulator: BotEmulator) {
  return (req: Restify.Request, res: Restify.Response, next: Restify.Next): any => {
    const activity = req.body as Activity;
    const conversationParameters: ConversationAPIPathParameters = req.params;
    let { webSocket } = botEmulator as any;
    if (!webSocket) {
      // start the websocket server up
      webSocket = new Server({ port: 5005 });

      console.log(`Socket running on ws://localhost:${5005}`);

      (webSocket as Server).on('connection', (socket, req) => {
        console.log('got connection');

        socket.on('message', data => {
          if (data === '') {
            console.log('Got ping from DLJS');
          }
        });
      });
    }

    try {
      activity.id = activity.id || null;
      activity.replyToId = req.params.activityId;

      const continuation = function(): void {
        const response: ResourceResponse = (req as any).conversation.postActivityToUser(activity, false, webSocket);

        res.send(HttpStatus.OK, response);
        res.end();
      };

      const { conversationId } = conversationParameters;
      const visitor = new OAuthLinkEncoder(botEmulator, req.headers.authorization as string, activity, conversationId);
      visitor
        .resolveOAuthCards(activity)
        .then(_ => {
          continuation();
        })
        .catch(
          // failed to generate an OAuth signin link
          (reason: any) => {
            botEmulator.facilities.logger.logException(conversationId, reason);
            botEmulator.facilities.logger.logException(
              conversationId,
              new Error('Falling back to emulated OAuth token.')
            );
            continuation();
          }
        );
    } catch (err) {
      sendErrorResponse(req, res, next, err);
    }

    next();
  };
}
