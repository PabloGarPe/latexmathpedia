"use client";

import { useMutation } from "@tanstack/react-query";
import { sendMail, type Mail } from "@/lib/api/mail";

export function useSendMail() {
  return useMutation({
    mutationFn: (body: Mail) => sendMail(body),
  });
}
