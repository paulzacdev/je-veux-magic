import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { t, getDirection } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function Chatbot() {
  const { language, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dir = getDirection(language);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history
  useEffect(() => {
    if (!user || historyLoaded) return;
    supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) setMessages(data as Message[]);
        setHistoryLoaded(true);
      });
  }, [user, historyLoaded]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setInput('');
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Save user message
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'user',
      content: userMsg.content,
    });

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-20),
          language,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast.error(errData.error || 'Trop de requêtes. Veuillez réessayer.');
          setMessages(prev => prev.slice(0, -1));
        } else if (resp.status === 402) {
          toast.error(errData.error || 'Service indisponible.');
          setMessages(prev => prev.slice(0, -1));
        } else {
          throw new Error(errData.error || 'Erreur du service IA');
        }
        setIsLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                }
                return [...prev, { role: 'assistant', content: assistantText }];
              });
            }
          } catch {}
        }
      }

      // Save assistant response
      if (assistantText) {
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          role: 'assistant',
          content: assistantText,
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erreur de connexion');
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-140px)]" dir={dir}>
        <h2 className="font-serif text-2xl font-bold text-center mb-3">
          💬 {t('chatbot', language)}
        </h2>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-2 px-1">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12 space-y-3">
              <p className="text-5xl">🕊</p>
              <p className="font-serif text-lg font-medium text-foreground">
                {language === 'ar' ? 'المرشد الروحي' : language === 'en' ? 'Spiritual Guide' : 'Guide spirituel'}
              </p>
              <p className="text-sm max-w-xs mx-auto leading-relaxed">
                {t('ask_question', language)}
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1 text-sm">
                  ✝
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 text-sm">
                ✝
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-3 border-t">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('ask_question', language)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={2}
            className="resize-none min-h-[44px] max-h-[120px]"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="flex-shrink-0 h-auto"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
