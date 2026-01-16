import Image from 'next/image'
import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="flex items-center h-12 hover:opacity-80 transition-opacity flex-shrink-0">
      <Image
        src="/logo_dark.png"
        alt="Le Dojo Financier"
        width={180}
        height={48}
        className="h-auto w-auto max-h-10 sm:max-h-12 max-w-[140px] sm:max-w-[200px] object-contain dark:hidden"
        priority
        sizes="(max-width: 640px) 140px, 200px"
      />
      <Image
        src="/logo_light.png"
        alt="Le Dojo Financier"
        width={180}
        height={48}
        className="h-auto w-auto max-h-10 sm:max-h-12 max-w-[140px] sm:max-w-[200px] object-contain hidden dark:block"
        priority
        sizes="(max-width: 640px) 140px, 200px"
      />
    </Link>
  )
}


