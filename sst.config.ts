/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hum",
      removal: input?.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: "us-east-1", profile: "hum" },
      },
    };
  },
  async run() {
    const isProd = $app.stage === "prod";

    // Shared env vars for all Lambda functions
    const sharedEnv = {
      HUM_MOCK_INTEGRATIONS: isProd ? "false" : "true",
    };

    // VPC with cheap EC2 NAT instance
    const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2" });

    // RDS Postgres
    const rds = new sst.aws.Postgres("Db", {
      vpc,
      instance: "t4g.micro",
    });

    // S3 media storage
    const media = new sst.aws.Bucket("Media");

    // Secrets
    const openaiKey = new sst.Secret("OpenaiApiKey");
    const falKey = new sst.Secret("FalApiKey");
    const ayrshareKey = new sst.Secret("AyrshareApiKey");
    const stripeKey = new sst.Secret("StripeSecretKey");
    const stripeWebhook = new sst.Secret("StripeWebhookSecret");
    const dashboardPassword = new sst.Secret("DashboardPassword");

    const allLinks = [rds, media, openaiKey, falKey, ayrshareKey, stripeKey, stripeWebhook];

    // Dashboard (Next.js)
    const dashboard = new sst.aws.Nextjs("Dashboard", {
      path: "hum-dashboard",
      vpc,
      link: [...allLinks, dashboardPassword],
      environment: {
        ...sharedEnv,
        MEDIA_BUCKET: media.name,
        DATABASE_URL: $interpolate`postgres://${rds.username}:${rds.password}@${rds.host}:${rds.port}/${rds.database}`,
        DASHBOARD_PASSWORD: dashboardPassword.value,
      },
    });

    // Content engine — weekly cron (Sunday 2am UTC)
    new sst.aws.Cron("ContentEngine", {
      schedule: "cron(0 2 ? * SUN *)",
      function: {
        handler: "hum-content-engine/src/handler.run",
        timeout: "15 minutes",
        memory: "1024 MB",
        vpc,
        link: allLinks,
        environment: {
          MEDIA_BUCKET: media.name,
          DATABASE_URL: $interpolate`postgres://${rds.username}:${rds.password}@${rds.host}:${rds.port}/${rds.database}`,
        },
      },
    });

    // Onboarding — on-demand async invocation
    const onboarding = new sst.aws.Function("Onboarding", {
      handler: "hum-onboarding/src/handler.run",
      timeout: "15 minutes",
      memory: "1024 MB",
      vpc,
      link: allLinks,
      environment: {
        ...sharedEnv,
        MEDIA_BUCKET: media.name,
        DATABASE_URL: $interpolate`postgres://${rds.username}:${rds.password}@${rds.host}:${rds.port}/${rds.database}`,
      },
    });

    return {
      dashboardUrl: dashboard.url,
      onboardingFn: onboarding.name,
    };
  },
});
