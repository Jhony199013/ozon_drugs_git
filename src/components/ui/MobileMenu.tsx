"use client";

import Image from "next/image";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <div
      className={`absolute top-16 left-0 right-0 bg-primary/60 backdrop-blur-sm border-t border-white/20 md:hidden z-50 overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen
          ? "opacity-100 max-h-32"
          : "opacity-0 max-h-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center px-4 py-3 gap-6">
        <div className="flex items-center gap-4">
          <a
            href="/api/redirect/telegram"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="hover:opacity-80 transition-opacity flex items-center"
            aria-label="Telegram"
          >
            <Image src="/TG.png" alt="Telegram" width={26} height={26} />
          </a>
          <a
            href="/api/redirect/vk"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="hover:opacity-80 transition-opacity flex items-center"
            aria-label="VKontakte"
          >
            <Image src="/VK.png" alt="VKontakte" width={26} height={26} />
          </a>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <a
            href="/api/redirect/chatbot"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="text-base font-bold hover:opacity-80 transition-opacity"
            style={{ fontFamily: "HelveticaNeue-Bold, Arial, sans-serif" }}
          >
            Чат-бот
          </a>
          <a
            href="/api/redirect/help"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="text-base font-bold hover:opacity-80 transition-opacity"
            style={{ fontFamily: "HelveticaNeue-Bold, Arial, sans-serif" }}
          >
            Помощь
          </a>
        </div>
      </div>
    </div>
  );
}
