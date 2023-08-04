import { useRouter } from 'next/navigation';

export default function Token() {
    const router = useRouter();
    router.push('/');
}