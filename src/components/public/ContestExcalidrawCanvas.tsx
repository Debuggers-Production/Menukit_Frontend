import React from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

interface ContestExcalidrawCanvasProps {
  onApiLoaded: (api: any) => void;
}

export default function ContestExcalidrawCanvas({ onApiLoaded }: ContestExcalidrawCanvasProps) {
  return (
    <div className="flex-1 w-full h-full min-h-0">
      <Excalidraw
        excalidrawAPI={onApiLoaded}
        UIOptions={{
          canvasActions: {
            imageUpload: false,
            loadScene: false,
            export: false,
            saveAsImage: false,
            saveToActiveFile: false,
          }
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}

