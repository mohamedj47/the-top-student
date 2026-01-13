const connect = useCallback(async (currentRetry = 0) => {
  const currentApiKey = getApiKey();
  try {
    setStatus('connecting');
    const ai = new GoogleGenAI({ apiKey: currentApiKey });
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    // كل حاجة 24000 Hz
    const inputCtx = new AudioContextClass({ sampleRate: 24000 });
    const outputCtx = new AudioContextClass({ sampleRate: 24000 });
    audioContextRef.current = outputCtx;
    inputAudioContextRef.current = inputCtx;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: 24000 },
    });
    mediaStreamRef.current = stream;

    const systemInstruction = `أنت "المعلم الذكي" لصف ${grade} مادة ${subject}. أجب بلهجة مصرية قصيرة ومباشرة. لا تزد عن جملتين.`;

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: async () => {
          if (!mountedRef.current) return;
          setStatus('connected');

          const source = inputCtx.createMediaStreamSource(stream);

          // ✅ استبدل ScriptProcessor بـ AudioWorklet
          await inputCtx.audioWorklet.addModule('/audio-processor.js');
          const workletNode = new AudioWorkletNode(inputCtx, 'audio-processor');

          workletNode.port.onmessage = (e) => {
            if (isMuted) return;
            const inputData = e.data as Float32Array;

            // تحويل الصوت لـ Base64
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const base64Data = encode(new Uint8Array(int16.buffer));

            // ✅ استخدم sessionRef.current مباشرة بدون then
            sessionRef.current?.sendRealtimeInput({
              media: {
                mimeType: 'audio/pcm;rate=24000',
                data: base64Data,
              },
            });
          };

          source.connect(workletNode);
          workletNode.connect(inputCtx.destination);

          // ✅ احفظ الـ worklet node للـ cleanup لاحقًا
          processorRef.current = workletNode as any;
        },

        onmessage: async (message: LiveServerMessage) => {
          if (!mountedRef.current) return;

          const base64EncodedAudioString =
            message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString && audioContextRef.current) {
            const outputCtx = audioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            
            const audioBuffer = await decodeAudioData(
              decode(base64EncodedAudioString),
              outputCtx,
              24000,
              1,
            );

            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);

            source.addEventListener('ended', () => sourcesRef.current.delete(source));

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);

            setVolumeLevel(0.8);
            setTimeout(() => setVolumeLevel(0), 200);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach((source) => { try { source.stop(); } catch(e) {} });
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },

        onerror: (e: any) => {
          console.error('Live session error:', e);
          if (e?.message?.includes('429')) markKeyAsFailed(currentApiKey);
          if (mountedRef.current && currentRetry < 2) {
            cleanup().then(() => connect(currentRetry + 1));
          } else {
            setStatus('error');
          }
        },

        onclose: () => {
          if (mountedRef.current) setStatus('connecting');
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction,
      },
    });

    sessionRef.current = await sessionPromise;

  } catch (e: any) {
    console.error('Connection failure:', e);
    if (e?.message?.includes('429')) markKeyAsFailed(currentApiKey);
    if (currentRetry < 2) cleanup().then(() => connect(currentRetry + 1));
    else setStatus('error');
  }
}, [grade, subject, isMuted, cleanup]);
