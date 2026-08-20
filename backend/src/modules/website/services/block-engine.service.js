import { z } from "zod";

const BaseBlockSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  anchorId: z.string().optional(),
  isVisible: z.boolean().default(true),
  responsive: z
    .object({
      hideOnMobile: z.boolean().default(false),
      hideOnDesktop: z.boolean().default(false),
    })
    .optional(),
});

export const HeroBlockSchema = BaseBlockSchema.extend({
  type: z.literal("hero"),
  data: z.object({
    headline: z.string().min(1).max(150),
    subheadline: z.string().max(400).optional(),
    primaryCta: z
      .object({
        label: z.string(),
        href: z.string(),
      })
      .optional(),
    backgroundImageUrl: z.string().optional(),
  }),
});

export const StatsBlockSchema = BaseBlockSchema.extend({
  type: z.literal("stats"),
  data: z.object({
    title: z.string().optional(),
    items: z
      .array(
        z.object({
          value: z.string(),
          label: z.string(),
          trend: z.string().optional(),
        })
      )
      .min(1)
      .max(10),
  }),
});

export const RichTextBlockSchema = BaseBlockSchema.extend({
  type: z.literal("richtext"),
  data: z.object({
    contentHtml: z.string().max(100000), // Max 100KB rich text HTML
  }),
});

export const FeatureGridBlockSchema = BaseBlockSchema.extend({
  type: z.literal("feature_grid"),
  data: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    items: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string().optional(),
      })
    ),
  }),
});

export const CardsBlockSchema = BaseBlockSchema.extend({
  type: z.literal("cards"),
  data: z.object({
    title: z.string().optional(),
    items: z.array(
      z.object({
        title: z.string(),
        summary: z.string(),
        href: z.string().optional(),
        image: z.string().optional(),
        metric: z.string().optional(),
      })
    ),
  }),
});

export const TestimonialBlockSchema = BaseBlockSchema.extend({
  type: z.literal("testimonials"),
  data: z.object({
    quote: z.string(),
    author: z.string(),
    role: z.string().optional(),
    company: z.string().optional(),
    avatarUrl: z.string().optional(),
  }),
});

export const CtaBlockSchema = BaseBlockSchema.extend({
  type: z.literal("cta"),
  data: z.object({
    headline: z.string(),
    subheadline: z.string().optional(),
    primaryCta: z.object({
      label: z.string(),
      href: z.string(),
    }),
    secondaryCta: z
      .object({
        label: z.string(),
        href: z.string(),
      })
      .optional(),
  }),
});

export const FaqBlockSchema = BaseBlockSchema.extend({
  type: z.literal("faq"),
  data: z.object({
    title: z.string().optional(),
    items: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
  }),
});

export const TimelineBlockSchema = BaseBlockSchema.extend({
  type: z.literal("timeline"),
  data: z.object({
    title: z.string().optional(),
    steps: z.array(
      z.object({
        stepNumber: z.number(),
        title: z.string(),
        description: z.string(),
      })
    ),
  }),
});

export const FormEmbedBlockSchema = BaseBlockSchema.extend({
  type: z.literal("form_embed"),
  data: z.object({
    formType: z.enum(["contact", "estimator", "job_apply"]),
    title: z.string().optional(),
    submitButtonText: z.string().default("Submit"),
  }),
});

export const BlockDiscriminatorSchema = z.discriminatedUnion("type", [
  HeroBlockSchema,
  StatsBlockSchema,
  RichTextBlockSchema,
  FeatureGridBlockSchema,
  CardsBlockSchema,
  TestimonialBlockSchema,
  CtaBlockSchema,
  FaqBlockSchema,
  TimelineBlockSchema,
  FormEmbedBlockSchema,
]);

export const BlockArraySchema = z.array(BlockDiscriminatorSchema).max(50, "Maximum 50 blocks allowed per page.");

/**
 * Validates array of layout blocks against Zod schemas.
 * Throws ZodError if validation fails.
 */
export function validateBlockArray(blocks) {
  if (!Array.isArray(blocks)) {
    throw new Error("Invalid blocks payload: expected array");
  }
  return BlockArraySchema.parse(blocks);
}
