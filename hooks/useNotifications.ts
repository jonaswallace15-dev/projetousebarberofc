'use client';

import { useEffect, useCallback, useRef } from 'react';
import { supabaseService } from '@/services/supabaseService';
import type { Appointment } from '@/types';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BMxAxXhS5tnRFp9kDXpBJvuh9HTT6ihAq22V0faVteEH2w16TcricpSZniD64mZcAPI3tiVfGES9DkpqqoAAKEc';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useNotifications = (userId: string | undefined) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 1.0;
      audioRef.current = audio;
    }
  }, []);

  const unlockAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
      }).catch(() => {});
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!userId || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await supabaseService.savePushSubscription(subscription);
    } catch (err) {
      console.error('Erro ao inscrever para Push:', err);
    }
  }, [userId]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPush();
      return true;
    }
    return false;
  }, [userId, subscribeToPush]);

  const showNotification = useCallback((appointment: Appointment) => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      const title = 'Novo Agendamento! ✂️';
      const options: any = {
        body: `${appointment.clientName} agendou ${appointment.serviceName} para ${appointment.date} às ${appointment.time}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'new-appointment',
        renotify: true,
        silent: true,
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        new window.Notification(title, options);
      }

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }
  }, []);

  return {
    requestPermission,
    unlockAudio,
    subscribeToPush,
    showNotification,
    permission: (typeof window !== 'undefined' && 'Notification' in window)
      ? (window.Notification as any).permission
      : 'default',
  };
};
