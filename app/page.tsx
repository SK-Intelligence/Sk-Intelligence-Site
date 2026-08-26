import { Hero } from '@/components/Hero';
import { Pillars } from '@/components/Pillars';
import { Process } from '@/components/Process';
import { Founders } from '@/components/Founders';
import { ClientWork } from '@/components/ClientWork';
import { Manifesto } from '@/components/Manifesto';
import { Cta } from '@/components/Cta';

export default function Home() {
  return (
    <>
      <Hero />
      <Pillars />
      <Process />
      <Founders />
      <ClientWork />
      <Manifesto />
      <Cta />
    </>
  );
}
