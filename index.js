import React, {forwardRef, memo, useCallback, useEffect, useMemo, useState,} from 'react';
import {PixelRatio, StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';

import htmlContent from './injectedHtml';
import injectedSignaturePad from './injectedJavaScript/signaturePad';
import injectedApplication from './injectedJavaScript/application';

const noopFunction = () => {};

const SignaturePad = (props, ref) => {
  const {
    onError = noopFunction,
    onLoadEnd = noopFunction,
    style = {},
    line = true,
    subtitle = '&nbsp;',
    loader = noopFunction,
    off = false,
  } = props;

  const [size, setSize] = useState(null);
  const onLayout = useCallback(e => {
    const ratio = Math.max(PixelRatio.get(), 1);
    const { width, height } = e.nativeEvent.layout;
    const newWidth = width * ratio;
    const newHeight = height * ratio;

    setSize({
      width: newWidth,
      height: newHeight,
      transform: [
        {
          translateX: (width - newWidth) / 2,
        },
        {
          translateY: (height - newHeight) / 2,
        },
        {
          scale: 1 / ratio,
        },
      ],
    });
  }, []);

  const [started, setStarted] = useState(false);
  const start = useCallback(() => {
    setTimeout(() => {
      setStarted(true);
      onLoadEnd();
    }, 100);
  }, []);

  const backgroundColor = useMemo(
    () => StyleSheet.flatten(style).backgroundColor || '#ffffff',
    [style]
  );

  const padStyle = useMemo(
    () => ({
      ...StyleSheet.absoluteFillObject,
      backgroundColor,
      opacity: started ? 1 : 0,
    }),
    [style, backgroundColor, started]
  );

  const containerStyle = useMemo(() => {
    return {
      flex: 1,
      ...style,
    };
  }, [style]);

  const onMessage = useCallback(event => {
    const { func, args } = JSON.parse(event.nativeEvent.data);
    if (props[func]) {
      props[func](...args);
    }
  }, []);

  const source = useMemo(() => {
    const script = `${injectedSignaturePad};${injectedApplication(props)};true;`;
    const ratio = Math.max(PixelRatio.get(), 1);
    return {
      html: htmlContent({
        script,
        backgroundColor,
        line,
        ratio,
        subtitle,
      }),
    };
  }, [props, backgroundColor, line, subtitle]);

  const [webViewInstance, setWebView] = useState();

  const setRef = useCallback(
    (webView) => {
      setWebView(webView);
      const getExecuteFunction = func => (...args) => {
        const strArgs = args.map(x => JSON.stringify(x)).join(',');
        webView.injectJavaScript(`window.${func}(${strArgs});true;`);
      };
      if (ref) {
        ref.current = {
          webView,
          clear: getExecuteFunction('signaturePad.clear'),
          toData: getExecuteFunction('toData'),
          toDataURL: getExecuteFunction('toDataURL'),
          undo: getExecuteFunction('undo'),
          cropData: getExecuteFunction('cropData'),
        };
      }
    },
    [ref]
  );

  useEffect(() => {
    if (!started || !webViewInstance) {
      return;
    }
    if (off) {
      webViewInstance.injectJavaScript('window.signaturePad.off();true;');
    } else {
      webViewInstance.injectJavaScript('window.signaturePad.on();true;');
    }
  }, [started, off, webViewInstance]);

  return (
    <View style={containerStyle} onLayout={onLayout}>
      {size && (
        <View style={size}>
          <WebView
            ref={setRef}
            automaticallyAdjustContentInsets={false}
            onMessage={onMessage}
            onLoadEnd={start}
            renderError={onError}
            renderLoading={loader}
            source={source}
            javaScriptEnabled={true}
            style={padStyle}
          />
        </View>
      )}
    </View>
  );
};

export default memo(forwardRef(SignaturePad));
