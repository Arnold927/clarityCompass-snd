import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const engagementData = [
  {
    name: "Global Fund",
    action: "sent a new quarterly report.",
    time: "5m ago",
    avatar: "GF",
    avatarBg: "bg-red-500",
  },
  {
    name: "Alice Johnson",
    action: "commented on Project Hope.",
    time: "30m ago",
    avatar: "AJ",
    avatarBg: "bg-blue-500",
  },
  {
    name: "Bill & Melinda Gates Foundation",
    action: "approved a new funding tranche.",
    time: "2h ago",
    avatar: "BM",
    avatarBg: "bg-green-500",
  },
  {
    name: "John Smith",
    action: "viewed the annual summary.",
    time: "1d ago",
    avatar: "JS",
    avatarBg: "bg-yellow-500",
  },
    {
    name: "Michael Chen",
    action: "requested a meeting.",
    time: "2d ago",
    avatar: "MC",
    avatarBg: "bg-purple-500",
  },
];

export function DonorEngagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Donor Engagement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {engagementData.map((item) => (
          <div key={item.name} className="flex items-center">
            <Avatar className="h-9 w-9">
              <span className={`flex h-full w-full items-center justify-center rounded-full text-white ${item.avatarBg}`}>
                {item.avatar}
              </span>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">
                {item.name}
              </p>
              <p className="text-sm text-muted-foreground">{item.action}</p>
            </div>
            <div className="ml-auto font-medium text-xs text-muted-foreground">{item.time}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
