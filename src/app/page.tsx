import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full">
      <h1>Home</h1>
      <nav>
        <ul className="text-center">
          <li>
            <Link href="/write">Write</Link>
          </li>
          <li>
            <Link href="/schedule">Schedule</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
