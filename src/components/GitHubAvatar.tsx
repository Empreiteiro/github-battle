interface Props {
  username: string;
  avatarUrl: string;
  className?: string;
}

export default function GitHubAvatar({ username, avatarUrl, className = 'w-8 h-8' }: Props) {
  return (
    <a
      href={`https://github.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`@${username} on GitHub`}
      className="flex-shrink-0 hover:opacity-80 transition-opacity"
    >
      <img
        src={avatarUrl}
        alt={username}
        className={`rounded-full ${className}`}
      />
    </a>
  );
}
