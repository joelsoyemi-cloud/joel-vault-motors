import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL('https://vault-motor-collection.neonokapi16.chatgpt.site'),title:'VAULT — The Vintage Motor Collection',description:'Five automotive icons. One cinematic showroom. An interactive 3D design study by Joel Soyemi, with reversible cloth reveals.',openGraph:{title:'VAULT — The Vintage Motor Collection',description:'Rediscover the extraordinary. Five vintage icons, revealed.',images:['/posters/corvette.webp']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
