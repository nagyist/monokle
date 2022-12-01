const Dashboard = ({width, height}: {width?: number; height?: number}) => {
  const iconWidth = width || '22';
  const iconHeight = height || '22';

  return (
    <svg width={iconWidth} height={iconHeight} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_503_4948)">
        <path
          d="M12.8495 6.73242V2.98124C12.8495 2.72812 12.7159 2.49609 12.5015 2.36601L9.37256 0.488666C9.14404 0.351556 8.86279 0.351556 8.63428 0.488666L5.50186 2.36601C5.28389 2.49609 5.15381 2.72812 5.15381 2.98124V6.73242C5.15381 6.98554 5.2874 7.21757 5.50186 7.34765L8.63428 9.22499C8.96475 9.41484 9.23896 9.31288 9.37256 9.22499L12.5015 7.34765C12.7159 7.21757 12.8495 6.98554 12.8495 6.73242V6.73242Z"
          fill="#DBDBDB"
        />
        <path
          d="M7.73438 10.6523L4.60547 8.775C4.37695 8.63789 4.0957 8.63789 3.86719 8.775L0.734766 10.6523C0.516797 10.7824 0.386719 11.0144 0.386719 11.2676V15.0187C0.386719 15.2719 0.520312 15.5039 0.734766 15.634L3.86719 17.5113C4.19766 17.7012 4.47188 17.5992 4.60547 17.5113L7.73438 15.634C7.95234 15.5039 8.08242 15.2719 8.08242 15.0187V11.2676C8.08242 11.0144 7.95234 10.7824 7.73438 10.6523Z"
          fill="#DBDBDB"
        />
        <path
          d="M17.2651 10.6488L14.1362 8.77148C13.9077 8.63437 13.6265 8.63437 13.3979 8.77148L10.2655 10.6488C10.0476 10.7789 9.91748 11.0109 9.91748 11.2641V15.0152C9.91748 15.2684 10.0511 15.5004 10.2655 15.6305L13.3944 17.5078C13.7249 17.6977 13.9991 17.5957 14.1327 17.5078L17.2616 15.6305C17.4796 15.5004 17.6097 15.2684 17.6097 15.0152V11.2641C17.6132 11.0109 17.4796 10.7789 17.2651 10.6488V10.6488Z"
          fill="#DBDBDB"
        />
      </g>
      <defs>
        <clipPath id="clip0_503_4948">
          <rect width="18" height="18" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default Dashboard;
