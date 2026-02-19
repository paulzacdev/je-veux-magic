import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { t, getDirection } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  fr: [
    'Comment vivre l\'Évangile de cette semaine ?',
    'Quelle prière pour commencer ma journée ?',
    'Comment pratiquer l\'humilité ?',
  ],
  ar: [
    'كيف أعيش إنجيل هذا الأسبوع؟',
    'ما هي الصلاة المناسبة لبداية يومي؟',
    'كيف أمارس التواضع؟',
  ],
  en: [
    'How to live this week\'s Gospel?',
    'What prayer to start my day?',
    'How to practice humility?',
  ],
};

export default function Chatbot() {
  const { language, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dir = getDirection(language);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const sendMessage = async (text?: string) => {
    const msgText = (text ?? input).trim();
    if (!msgText || isLoading || !user) return;
    const userMsg: Message = { role: 'user', content: msgText };
    setInput('');
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

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
        toast.error(errData.error || 'Erreur du service IA');
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

      if (assistantText) {
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          role: 'assistant',
          content: assistantText,
        });
      }
    } catch (e: any) {
      toast.error(e.message || 'Erreur de connexion');
    }
    setIsLoading(false);
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from('chat_messages').delete().eq('user_id', user.id);
    setMessages([]);
    toast.success('Conversation effacée');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggested = SUGGESTED_QUESTIONS[language] ?? SUGGESTED_QUESTIONS['fr'];
  const showEmpty = messages.length === 0 && historyLoaded;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-140px)]" dir={dir}>

        {/* Header bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-serif font-semibold text-foreground text-sm leading-tight">
                {language === 'ar' ? 'المرشد الروحي' : language === 'en' ? 'Spiritual Guide' : 'Guide Spirituel'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {language === 'ar' ? 'مدعوم بالذكاء الاصطناعي' : language === 'en' ? 'AI-powered' : 'Propulsé par l\'IA'}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Effacer l'historique"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-2 px-1 scrollbar-none">

          {/* Empty state */}
          {showEmpty && (
            <div className="flex flex-col items-center pt-6 pb-4 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-3xl shadow-inner">
                  ✝
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
              </div>
              <div className="text-center space-y-1 px-4">
                <p className="font-serif text-lg font-semibold text-foreground">
                  {language === 'ar' ? 'كيف يمكنني مساعدتك؟' : language === 'en' ? 'How can I help you?' : 'Comment puis-je vous aider ?'}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {language === 'ar'
                    ? 'اطرح سؤالاً روحياً أو ابدأ محادثة'
                    : language === 'en'
                    ? 'Ask a spiritual question or start a conversation'
                    : 'Posez une question spirituelle ou commencez une conversation'}
                </p>
              </div>

              {/* Suggested questions */}
              <div className="w-full space-y-2 px-2">
                {suggested.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left px-4 py-3 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-sm text-foreground group"
                  >
                    <span className="text-primary mr-2">✦</span>
                    <span className="group-hover:text-primary transition-colors">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-xs flex-shrink-0 mb-0.5 text-primary font-serif">
                  ✝
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card border border-border rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-xs flex-shrink-0 text-primary font-serif">
                ✝
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input area */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('ask_question', language)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              dir={dir}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[24px] max-h-[120px] leading-relaxed py-1"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-8 w-8 rounded-xl flex-shrink-0 mb-0.5"
            >
              {isLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />
              }
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1.5">
            {language === 'ar' ? 'اضغط Enter للإرسال • Shift+Enter لسطر جديد' : language === 'en' ? 'Enter to send • Shift+Enter for new line' : 'Entrée pour envoyer • Maj+Entrée pour nouvelle ligne'}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
