import { ChevronRight } from "lucide-react";
import { Button } from "@/components/button";
import { Typography } from "@/components/typography";
import { Container, Section, Stack } from "../_layout";

interface FooterProps {
  onGetStartedClick?: () => void;
}

export function FooterSection({ onGetStartedClick }: FooterProps) {
  const handleGetStartedClick = () => {
    if (onGetStartedClick) {
      onGetStartedClick();
    } else {
      // For Astro, we'll just navigate to a placeholder or external URL
      window.location.href = "/workspaces";
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      {/* CTA Section */}
      <Section className="relative overflow-hidden py-24">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://api.builder.io/api/v1/image/assets/TEMP/7f326b8d7f89221bd2773a6561923b86f005eb55?width=2400')",
          }}
        />

        <Container size="lg" className="relative z-10">
          <div className="text-center max-w-[600px] mx-auto">
            <Stack spacing="lg">
              <Typography.Hero className="text-white">
                Start your trial today.
              </Typography.Hero>

              <Typography.BodyLg className="text-gray-300 leading-6">
                Unlock the potential of your business with our next-level SaaS
                platform. Transform your workflows and achieve new heights
                today.
              </Typography.BodyLg>

              <div className="mt-12">
                <Button
                  onClick={handleGetStartedClick}
                  className="bg-white text-gray-900 font-semibold hover:bg-gray-100 shadow-lg px-5 pr-4 h-[44px] rounded-xl"
                >
                  Get started
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Main Footer Content */}
      <Section className="py-16">
        <Container size="xl">
          <Stack spacing="lg">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#020A0F]" />
              </div>
              <span className="text-lg font-semibold text-white">
                Openpromo
              </span>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <SocialIcon>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M4 2C2.895 2 2 2.895 2 4V14C2 15.105 2.895 16 4 16H14C15.105 16 16 15.105 16 14V4C16 2.895 15.105 2 14 2H4ZM9.871 8.337L13 13H10.528L8.498 9.974L5.942 13H5L8.08 9.353L5.16 5H7.632L9.457 7.72L11.755 5H12.698L9.877 8.342L9.871 8.337ZM11.648 12.273L7.258 5.727H6.508L10.901 12.273H11.648Z"
                    fill="#A4A8AF"
                  />
                </svg>
              </SocialIcon>

              <SocialIcon>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M4 2C2.895 2 2 2.895 2 4V14C2 15.105 2.895 16 4 16H14C15.105 16 16 15.105 16 14V4C16 2.895 15.105 2 14 2H4ZM6.56 7.155V12.85H4.79V7.155H6.56ZM6.596 5.832C6.405 6.157 6.052 6.351 5.675 6.34C5.105 6.341 4.642 5.879 4.642 5.308C4.641 4.738 5.103 4.276 5.673 4.275C6.049 4.263 6.403 4.457 6.595 4.781C6.787 5.105 6.787 5.508 6.596 5.832ZM13.2 9.726V12.85H11.432V10.08C11.432 9.42 11.419 8.57 10.512 8.57C9.591 8.57 9.449 9.29 9.449 10.033V12.85H7.68V7.155H9.378V7.933H9.402C9.638 7.485 10.216 7.013 11.076 7.013C12.869 7.013 13.2 8.193 13.2 9.726Z"
                    fill="#A4A8AF"
                  />
                </svg>
              </SocialIcon>

              <SocialIcon>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M14.544 3.99593C13.506 3.52693 12.411 3.19193 11.288 3.00093C11.267 2.99693 11.246 3.00593 11.235 3.02493C11.086 3.29093 10.951 3.56493 10.83 3.84493C9.617 3.66393 8.385 3.66393 7.172 3.84493C7.05 3.56393 6.912 3.28993 6.76 3.02493C6.749 3.00693 6.729 2.99793 6.708 3.00093C5.583 3.19093 4.488 3.52593 3.451 3.99493C3.442 3.99893 3.435 4.00493 3.43 4.01293C1.355 7.06293 0.787001 10.0369 1.066 12.9739C1.067 12.9889 1.075 13.0019 1.086 13.0109C2.297 13.8929 3.648 14.5639 5.082 14.9979C5.103 15.0039 5.125 14.9969 5.138 14.9799C5.447 14.5679 5.72 14.1299 5.955 13.6719C5.965 13.6529 5.961 13.6289 5.945 13.6139C5.94 13.6089 5.934 13.6049 5.928 13.6019C5.497 13.4399 5.08 13.2439 4.68 13.0169C4.665 13.0089 4.656 12.9929 4.655 12.9759C4.654 12.9589 4.661 12.9429 4.675 12.9329C4.758 12.8709 4.842 12.8069 4.922 12.7429C4.936 12.7309 4.957 12.7279 4.974 12.7349C7.593 13.9119 10.427 13.9119 13.015 12.7349C13.023 12.7309 13.033 12.7299 13.042 12.7309C13.051 12.7319 13.06 12.7349 13.067 12.7409C13.147 12.8059 13.231 12.8709 13.316 12.9329C13.329 12.9429 13.337 12.9589 13.336 12.9759C13.335 12.9929 13.326 13.0079 13.311 13.0169C12.913 13.2469 12.495 13.4419 12.063 13.6019C12.049 13.6069 12.038 13.6169 12.033 13.6309C12.028 13.6439 12.029 13.6589 12.036 13.6709C12.276 14.1269 12.548 14.5639 12.852 14.9789C12.864 14.9969 12.887 15.0049 12.908 14.9989C14.344 14.5659 15.697 13.8939 16.91 13.0109C16.922 13.0019 16.93 12.9889 16.931 12.9739C17.265 9.57893 16.372 6.62893 14.565 4.01393C14.561 4.00493 14.554 3.99793 14.545 3.99393L14.544 3.99593ZM6.346 11.1859C5.558 11.1859 4.909 10.4739 4.909 9.59993C4.909 8.72493 5.546 8.01293 6.346 8.01293C7.154 8.01293 7.797 8.73193 7.785 9.59993C7.785 10.4739 7.147 11.1859 6.346 11.1859ZM11.663 11.1859C10.875 11.1859 10.225 10.4739 10.225 9.59993C10.225 8.72493 10.862 8.01293 11.663 8.01293C12.47 8.01293 13.113 8.73193 13.101 9.59993C13.101 10.4739 12.47 11.1859 11.663 11.1859Z"
                    fill="#A4A8AF"
                  />
                </svg>
              </SocialIcon>

              <SocialIcon>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M12.512 2.96218C11.452 2.32418 10.237 1.99118 9 2.00018C7.763 1.99118 6.547 2.32418 5.487 2.96218C4.424 3.59518 3.546 4.49518 2.941 5.57318C2.311 6.67418 2 7.87418 2 9.17618C2 10.7382 2.445 12.1452 3.335 13.3932C4.225 14.6402 5.374 15.5062 6.784 15.9842C6.949 16.0162 7.071 15.9942 7.148 15.9192C7.226 15.8472 7.27 15.7452 7.267 15.6392L7.263 15.1342C7.26 14.8162 7.258 14.5392 7.258 14.3022L7.049 14.3392C6.882 14.3662 6.712 14.3772 6.543 14.3712C6.33 14.3682 6.118 14.3462 5.909 14.3062C5.687 14.2632 5.478 14.1672 5.301 14.0262C5.113 13.8792 4.973 13.6792 4.9 13.4522L4.809 13.2362C4.732 13.0662 4.636 12.9072 4.522 12.7612C4.39 12.5862 4.259 12.4672 4.125 12.4042L4.061 12.3582C4.018 12.3252 3.978 12.2882 3.942 12.2472C3.909 12.2082 3.882 12.1632 3.862 12.1162C3.844 12.0712 3.858 12.0362 3.906 12.0082C3.955 11.9782 4.043 11.9662 4.17 11.9662L4.354 11.9942C4.474 12.0192 4.625 12.0932 4.804 12.2172C4.984 12.3422 5.131 12.5042 5.245 12.7042C5.385 12.9582 5.554 13.1532 5.752 13.2872C5.949 13.4212 6.148 13.4892 6.35 13.4892C6.548 13.4892 6.722 13.4722 6.868 13.4412C7.014 13.4112 7.151 13.3632 7.278 13.3012C7.334 12.8842 7.482 12.5632 7.724 12.3392C7.409 12.3072 7.098 12.2502 6.791 12.1702C6.491 12.0862 6.203 11.9632 5.935 11.8052C5.651 11.6482 5.401 11.4352 5.201 11.1792C5.007 10.9322 4.847 10.6042 4.723 10.2012C4.592 9.74518 4.53 9.27318 4.537 8.79918C4.537 8.04618 4.776 7.40418 5.257 6.87418C5.032 6.30718 5.052 5.67218 5.321 4.96718C5.496 4.91218 5.757 4.95318 6.104 5.09318C6.45 5.23318 6.703 5.35318 6.865 5.45218C7.026 5.55218 7.155 5.63618 7.252 5.70618C7.821 5.54518 8.409 5.46418 9 5.46518C9.602 5.46518 10.185 5.54618 10.75 5.70818L11.096 5.48318C11.333 5.33518 11.613 5.19818 11.935 5.07218C12.258 4.94818 12.504 4.91518 12.675 4.97018C12.948 5.67418 12.972 6.30818 12.747 6.87718C13.227 7.40618 13.467 8.04718 13.467 8.80018C13.467 9.33018 13.405 9.79818 13.28 10.2062C13.156 10.6152 12.995 10.9432 12.796 11.1892C12.592 11.4412 12.342 11.6522 12.059 11.8102C11.765 11.9782 11.478 12.0992 11.203 12.1742C10.926 12.2492 10.616 12.3062 10.268 12.3412C10.584 12.6212 10.742 13.0632 10.742 13.6682V15.6402C10.739 15.7452 10.78 15.8472 10.856 15.9202C10.932 15.9952 11.052 16.0162 11.216 15.9852C12.627 15.5042 13.776 14.6412 14.665 13.3912C15.554 12.1452 16 10.7382 16 9.17518C16.01 7.91318 15.686 6.67118 15.061 5.57418C14.455 4.49618 13.577 3.59618 12.515 2.96318H12.513L12.512 2.96218Z"
                    fill="#A4A8AF"
                  />
                </svg>
              </SocialIcon>
            </div>

            {/* Footer Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl">
              <FooterColumn
                title="Product"
                links={["Pricing", "Integrations", "Changelog", "Book a demo"]}
              />

              <FooterColumn
                title="Company"
                links={["About", "Blog", "Career", "Contact"]}
              />

              <FooterColumn
                title="Resources"
                links={["Download", "Waitlist", "404"]}
              />

              <FooterColumn
                title="Support"
                links={["Terms of service", "Privacy policy"]}
              />
            </div>
          </Stack>
        </Container>
      </Section>

      {/* Bottom Section */}
      <Section className="border-t border-gray-800 py-6">
        <Container size="xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-[#A4A8AF]">
              © 2025 Openpromo. All rights reserved.
            </p>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#77DB89]" />
                <span className="text-[#E6E6EB]">System status</span>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </footer>
  );
}

interface SocialIconProps {
  children: React.ReactNode;
}

function SocialIcon({ children }: SocialIconProps) {
  return (
    <div className="w-[18px] h-[18px] flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
      {children}
    </div>
  );
}

interface FooterColumnProps {
  title: string;
  links: string[];
}

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[15px] font-medium text-[#E6E6EB]">{title}</h3>
      <div className="flex flex-col gap-4">
        {links.map((link) => (
          <button
            key={link}
            type="button"
            className="text-[15px] text-[#A4A8AF] hover:text-[#E6E6EB] transition-colors text-left"
          >
            {link}
          </button>
        ))}
      </div>
    </div>
  );
}
