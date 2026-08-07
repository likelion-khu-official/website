import type { SVGProps } from 'react';

type Icon = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

export type MemberNavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  Icon: Icon;
};

const iconBase: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const HomeIcon: Icon = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);

const BlogIcon: Icon = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M4 4h10l6 6v10H4z" />
    <path d="M14 4v6h6" />
    <path d="M8 13h8M8 17h5" />
  </svg>
);

const ProjectIcon: Icon = (props) => (
  <svg {...iconBase} {...props}>
    <rect x="3" y="4" width="7.5" height="7.5" rx="1.4" />
    <rect x="13.5" y="4" width="7.5" height="7.5" rx="1.4" />
    <rect x="3" y="12.5" width="7.5" height="7.5" rx="1.4" />
    <rect x="13.5" y="12.5" width="7.5" height="7.5" rx="1.4" />
  </svg>
);

const ProfileIcon: Icon = (props) => (
  <svg {...iconBase} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
);

export const MEMBER_NAV: MemberNavItem[] = [
  { href: '/member', label: '홈', isActive: (p) => p === '/member', Icon: HomeIcon },
  {
    href: '/member/posts',
    label: '블로그',
    isActive: (p) => p.startsWith('/member/posts') || p === '/member/write',
    Icon: BlogIcon,
  },
  {
    href: '/member/projects',
    label: '프로젝트',
    isActive: (p) => p.startsWith('/member/projects'),
    Icon: ProjectIcon,
  },
  { href: '/member/profile', label: '프로필', isActive: (p) => p === '/member/profile', Icon: ProfileIcon },
];
