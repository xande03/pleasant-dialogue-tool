import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMobile } from '@/hooks/use-mobile';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const isMobile = useMobile();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 2.5 }}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-24 h-24 rounded-full bg-gradient-aurora p-1">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-aurora flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-background" />
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-foreground">Pleasant Dialogue Tool</h1>
          <p className="text-muted-foreground mt-2">Nova mensagem adicionada no splashscreen</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
