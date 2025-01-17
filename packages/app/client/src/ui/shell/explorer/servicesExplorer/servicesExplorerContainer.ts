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

import { SharedConstants } from '@bfemulator/app-shared';
import { IConnectedService, ServiceTypes } from 'botframework-config/lib/schema';
import { ComponentClass } from 'react';
import { connect } from 'react-redux';

import {
  ConnectedServicePickerPayload,
  openAddServiceContextMenu,
  openContextMenuForConnectedService,
  openServiceDeepLink,
  openSortContextMenu,
} from '../../../../state/actions/connectedServiceActions';
import { CONNECTED_SERVICES_PANEL_ID } from '../../../../state/actions/explorerActions';
import { executeCommand } from '../../../../state/actions/commandActions';
import { RootState } from '../../../../state/store';

import { ConnectedServiceEditor } from './connectedServiceEditor/connectedServiceEditor';
import { ServicesExplorer, ServicesExplorerProps } from './servicesExplorer';

const mapStateToProps = (state: RootState): Partial<ServicesExplorerProps> => {
  const { services = [] } = state.bot.activeBot;
  const { [CONNECTED_SERVICES_PANEL_ID]: sortCriteria } = state.explorer.sortSelectionByPanelId;
  return {
    services: services.filter(
      service =>
        service.type === ServiceTypes.QnA ||
        service.type === ServiceTypes.Dispatch ||
        service.type === ServiceTypes.AppInsights ||
        service.type === ServiceTypes.BlobStorage ||
        service.type === ServiceTypes.CosmosDB ||
        service.type === ServiceTypes.Generic ||
        service.type === ServiceTypes.Luis
    ),
    sortCriteria,
    window,
  };
};

const mapDispatchToProps = (dispatch): Partial<ServicesExplorerProps> => {
  return {
    onAnchorClick: (url: string) => {
      dispatch(executeCommand(true, SharedConstants.Commands.Electron.OpenExternal, null, url));
    },
    openAddServiceContextMenu: (payload: ConnectedServicePickerPayload) =>
      new Promise(resolve => dispatch(openAddServiceContextMenu(payload, resolve))),
    openServiceDeepLink: (connectedService: IConnectedService) => dispatch(openServiceDeepLink(connectedService)),

    openContextMenuForService: (
      connectedService: IConnectedService,
      editorComponent: ComponentClass<ConnectedServiceEditor>
    ) => dispatch(openContextMenuForConnectedService(editorComponent, connectedService)),

    openSortContextMenu: () => dispatch(openSortContextMenu()),
  };
};

export const ServicesExplorerContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ServicesExplorer);
