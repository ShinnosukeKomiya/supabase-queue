'use client';

import SignUpUserSteps from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { enqueueMessage } from '@/app/actions';

const MessageForm = () => {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await enqueueMessage(formData);

      if (result.error) {
        setStatus(`Error: ${result.error}`);
      } else {
        setStatus(`Message queued successfully with ID: ${result.messageId}`);
        (event.target as HTMLFormElement).reset();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            name="message"
            placeholder="Enter your message"
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Message'}
        </Button>
        {status && (
          <div className={`text-sm ${
            status.includes('Error') ? 'text-destructive' : 'text-primary'
          }`}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
};

export default MessageForm;
