const daysSinceFirst = new Date().getDate();

// Get the scoreboard data from Advent of Code
const result = await fetch(process.env.AOC_URL, {
  method: "GET",
  headers: {
    Cookie: process.env.AOC_COOKIE,
  },
}).then((res) => res.json());

// Extract what we need from the data
const mappedData = Object.values(result.members)
  .map((member) => {
    const days = Object.values(member.completion_day_level).map((it) => ({
      status: getDayStatus(it),
    }));

    const missingDays =
      days.length < daysSinceFirst ? Array(daysSinceFirst - days.length).fill({ status: "Unfinished" }) : [];

    return {
      name: member.name,
      score: member.local_score,
      days: [...days, ...missingDays],
    };
  })
  .sort((a, b) => b.score - a.score);

// Post the scoreboard to Slack using markdown
const slackResult = await fetch(process.env.SLACK_HOOK, {
  method: "POST",
  body: JSON.stringify({
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `:kermprehension: Advent of Code dag ${daysSinceFirst} :christmas_tree:`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: createScoreboardMarkdown(mappedData),
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Postes daglig 22:00, kilde: https://github.com/karl-run/aoc-post-daily`,
          },
        ],
      },
    ],
  }),
});

// Need to process.exit(1) to make GHA fail if the script fails
if (!slackResult.ok) {
  console.error(await slackResult.text());
  process.exit(1);
} else {
  process.exit(0);
}

function getDayStatus(it) {
  if (Object.hasOwn(it, "2")) {
    return "Finished";
  } else if (Object.hasOwn(it, "1")) {
    return "Partial";
  } else {
    return "Unfinished";
  }
}

function createStars(days) {
  return days
    .map((it) => {
      switch (it.status) {
        case "Finished":
          return "★";
        case "Partial":
          return "☆";
        default:
          return "﹡";
      }
    })
    .join("");
}

function createScoreboardMarkdown(mappedData) {
  return mappedData
    .map((it, index) => `${index + 1}) ${it.score.toString().padEnd(3, " ")}\t${createStars(it.days)} \t\t${it.name}`)
    .join("\n");
}
