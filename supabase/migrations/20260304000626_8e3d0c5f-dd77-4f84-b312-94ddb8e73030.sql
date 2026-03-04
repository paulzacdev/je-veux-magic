-- Allow users to delete their own chat messages
CREATE POLICY "Users can delete own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);