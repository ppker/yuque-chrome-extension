import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ClippingTypeEnum,
  SandBoxMessageKey,
  SandBoxMessageType,
} from '@/isomorphic/sandbox';
import { message } from 'antd';
import eventManager from '@/core/event/eventManager';
import { AppEvents } from '@/core/event/events';
import { ocrManager } from '../ocr/ocr-manager';

interface ISandboxContext {
  defaultSelectHTML: HTMLElement[];
  clippingType: ClippingTypeEnum | null;
  editorLoading: boolean;
  updateClippingType: React.Dispatch<
    React.SetStateAction<ClippingTypeEnum | null>
  >;
}

export const SandboxContext = createContext<ISandboxContext>({
  defaultSelectHTML: [],
  clippingType: null,
  editorLoading: false,
  updateClippingType: () => {
    //
  },
});

interface ISandboxProviderProps {
  children?: React.ReactNode;
}

export function SandboxProvider(props: ISandboxProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [defaultSelectHTML, setDefaultSelectHTML] = useState<any[]>([]);
  const [clippingType, updateClippingType] = useState<ClippingTypeEnum | null>(
    null,
  );
  const [editorLoading, setEditorLoading] = useState(false);

  useEffect(() => {
    const listener = (e: MessageEvent<any>) => {
      if (e.data?.key !== SandBoxMessageKey) {
        return;
      }
      const { action, data } = e.data || {};
      switch (action) {
        case SandBoxMessageType.getSelectedHtml: {
          const { HTMLs, type } = data;
          setDefaultSelectHTML(HTMLs);
          if (type !== undefined) {
            updateClippingType(type);
          }
          setIsReady(true);
          break;
        }
        case SandBoxMessageType.initSandbox: {
          setIsReady(true);
          break;
        }
        case SandBoxMessageType.startOcr: {
          setIsReady(true);
          if (!data.blob) {
            message.error('图片不支持 ocr');
            return;
          }
          setEditorLoading(true);
          ocrManager.startOCR('blob', data.blob).then(res => {
            setDefaultSelectHTML(res?.map(item => item.text) || []);
            setEditorLoading(false);
          });
          break;
        }
        default:
          break;
      }
    };
    const onClose = () => {
      setDefaultSelectHTML([]);
      updateClippingType(null);
    };
    window.addEventListener('message', listener);
    eventManager.addListener(AppEvents.CLOSE_BOARD, onClose);
    return () => {
      window.addEventListener('message', listener);
      eventManager.removeListener(AppEvents.CLOSE_BOARD, onClose);
    };
  }, []);
  return (
    <SandboxContext.Provider
      value={{
        defaultSelectHTML,
        clippingType,
        editorLoading,
        updateClippingType,
      }}
    >
      {isReady && props.children}
    </SandboxContext.Provider>
  );
}

export function useSandboxContext() {
  const context = useContext(SandboxContext);
  return context;
}