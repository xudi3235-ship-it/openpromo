import { Avatar, AvatarFallback } from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@openpromo/ui/components/dialog";
import { Input } from "@openpromo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";
import { UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Member";
  status: "Active" | "Invited";
}

const seedMembers: WorkspaceMember[] = [
  {
    id: "1",
    name: "Brenda Chen",
    email: "brenda@acme.co",
    role: "Owner",
    status: "Active",
  },
  {
    id: "2",
    name: "Miles Rodriguez",
    email: "miles@acme.co",
    role: "Admin",
    status: "Active",
  },
  {
    id: "3",
    name: "Sofia Patel",
    email: "sofia@acme.co",
    role: "Member",
    status: "Invited",
  },
];

export function TeamManagement() {
  const [members, setMembers] = useState<WorkspaceMember[]>(seedMembers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState({ email: "", role: "Member" });

  const handleInvite = () => {
    if (!formState.email.trim()) {
      toast.error("Please enter an email address.");
      return;
    }

    const emailExists = members.some(
      (member) => member.email.toLowerCase() === formState.email.toLowerCase(),
    );

    if (emailExists) {
      toast.error("That email is already part of this workspace.");
      return;
    }

    const newMember: WorkspaceMember = {
      id: crypto.randomUUID(),
      name: formState.email.split("@")[0],
      email: formState.email,
      role: formState.role as WorkspaceMember["role"],
      status: "Invited",
    };

    setMembers((prev) => [...prev, newMember]);
    setIsDialogOpen(false);
    setFormState({ email: "", role: "Member" });
    toast.success("Invitation sent", {
      description: `We emailed ${newMember.email} with instructions to join the workspace.`,
    });
  };

  const handleRemove = (memberId: string) => {
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
    toast("Member removed", {
      description: "They will immediately lose access to this workspace.",
    });
  };

  const renderStatusBadge = (status: WorkspaceMember["status"]) => {
    if (status === "Active") {
      return <Badge variant="secondary">Active</Badge>;
    }
    return <Badge variant="outline">Invited</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Team</h1>
            <p className="text-sm text-muted-foreground">
              Manage who can collaborate in this workspace and what they can do.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" /> Invite teammate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite to workspace</DialogTitle>
                <DialogDescription>
                  Send an invitation email so they can join this workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email address
                  </label>
                  <Input
                    type="email"
                    placeholder="teammate@company.com"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Role
                  </label>
                  <Select
                    value={formState.role}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        role: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Owner">Owner</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite}>Send invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs text-muted-foreground">
          Owners can manage billing, admins can publish and manage members,
          members can view and collaborate on content.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {member.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.name}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.email}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{member.role}</Badge>
                </TableCell>
                <TableCell>{renderStatusBadge(member.status)}</TableCell>
                <TableCell className="text-right">
                  {member.role !== "Owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => handleRemove(member.id)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove member</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
