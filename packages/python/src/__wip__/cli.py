import argparse


def parse_args():
    parser = argparse.ArgumentParser(
        description="CLI for openpromo - toolkit for content generation."
    )

    parser.add_argument(
        "-s",
        "--script",
        choices=["deep_research", "gen_script", "gen_slides", "gen_video"],
        default="gen_script",
        help="Script to run (default: %(default)s)",
    )

    parser.add_argument("-o", "--output", help="Output file path")

    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose output",
        default=True,
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    print(f"Running script: {args.script}")

    # Display all arguments when verbose is enabled
    if args.verbose:
        print("Arguments:")
        for arg, value in vars(args).items():
            print(f"  {arg}: {value}")
