"use client";

import { ReactFlowProvider } from "reactflow";
import { Tooltip } from "@/components/emcn";
import { GlobalCommandsProvider } from "@/app/workspace/[workspaceId]/providers/global-commands-provider";
import { ProviderModelsLoader } from "@/app/workspace/[workspaceId]/providers/provider-models-loader";
import { SettingsLoader } from "@/app/workspace/[workspaceId]/providers/settings-loader";
import { WorkspacePermissionsProvider } from "@/app/workspace/[workspaceId]/providers/workspace-permissions-provider";
import { Panel } from "@/app/workspace/[workspaceId]/components/panel/panel";
import { SidebarNew } from "@/app/workspace/[workspaceId]/components/sidebar/sidebar-new";
import { Terminal } from "@/app/workspace/[workspaceId]/components/terminal/terminal";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReactFlowProvider>
      <SettingsLoader />
      <ProviderModelsLoader />
      <GlobalCommandsProvider>
        <Tooltip.Provider delayDuration={600} skipDelayDuration={0}>
          <WorkspacePermissionsProvider>
            <div className="flex min-h-screen w-full">
              <SidebarNew />
              <div className="relative flex flex-1 flex-col">
                {children}
                <Panel />
                <Terminal />
              </div>
            </div>
          </WorkspacePermissionsProvider>
        </Tooltip.Provider>
      </GlobalCommandsProvider>
    </ReactFlowProvider>
  );
}
