import { Github, Twitter, Users } from "lucide-react";
import SectionHeader from "../elements/section-header";

const teamMembers = [
  {
    name: "Alex Johnson",
    role: "CEO & Founder",
    image: "/images/team/1.png",
    bio: "With a background in software development and a vision for productivity, Alex leads the team with passion on user-first innovation.",
    social: {
      twitter: "#",
      github: "#",
    },
  },
  {
    name: "Jamie Lee",
    role: "Chief Product Officer",
    image: "/images/team/2.png",
    bio: "Jamie brings years of experience in product design and strategy, ensuring each feature meets the highest standards of functionality and design.",
    social: {
      twitter: "#",
    },
  },
  {
    name: "Taylor Smith",
    role: "Head of Engineering",
    image: "/images/team/3.png",
    bio: "Taylor drives the technical vision, overseeing development and ensuring the product is robust, secure, and scalable for users.",
    social: {
      twitter: "#",
      github: "#",
    },
  },
  {
    name: "Morgan Davis",
    role: "Marketing Lead",
    image: "/images/team/4.png",
    bio: "With a knack for storytelling and a deep understanding of the market, Morgan communicates our mission and product benefits to the world.",
    social: {
      twitter: "#",
    },
  },
];

const Team = () => {
  return (
    <section className="">
      <SectionHeader
        iconTitle="Team up!"
        title="The Minds Behind the Mission"
        icon={Users}
        description="A dedicated team passionate about shaping the future of productivity."
        className={"border-none"}
      />

      <div className="container mt-10 grid gap-x-12 gap-y-16 sm:grid-cols-2 md:mt-14 lg:grid-cols-4">
        {teamMembers.map((member) => (
          <div key={member.name} className="group flex flex-col">
            <img
              src={member.image}
              alt={member.name}
              width={80}
              height={80}
              className="rounded-full object-contain"
            />
            <div className="mt-6 flex flex-col tracking-[-0.32px]">
              <h3 className="text-lg">{member.name}</h3>
              <p className="text-muted-foreground-subtle">{member.role}</p>
              <p className="text-muted-foreground mt-4 text-sm tracking-[-0.36px]">
                {member.bio}
              </p>
              <div className="mt-6 flex gap-2">
                {member.social.twitter && (
                  <a
                    href={member.social.twitter}
                    className="hover:text-foreground"
                  >
                    <Twitter className="size-4" />
                  </a>
                )}
                {member.social.github && (
                  <a
                    href={member.social.github}
                    className="hover:text-foreground"
                  >
                    <Github className="size-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Team;
