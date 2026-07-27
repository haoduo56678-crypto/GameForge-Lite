package ai.gameforge.runtime.client;

import ai.gameforge.runtime.GameForgeRuntime.GameForgeComponent;
import ai.gameforge.runtime.GameForgeRuntime.GameForgeProject;
import net.minecraft.ChatFormatting;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.StringTag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.SpawnEggItem;

import java.util.Locale;
import java.util.Optional;

public final class GameForgeItemFactory {
    private GameForgeItemFactory() {
    }

    public static ItemStack componentStack(GameForgeProject project, GameForgeComponent component) {
        ItemStack stack;
        if (component.entityLike()) {
            stack = entityIcon(component);
        } else {
            stack = new ItemStack(resolveItem(resolveBaseItem(component)));
        }

        if (stack.isEmpty()) {
            stack = new ItemStack(Items.BARRIER);
        }

        stack.setHoverName(Component.literal(component.name()).withStyle(component.bossLike()
            ? ChatFormatting.LIGHT_PURPLE
            : ChatFormatting.AQUA));

        CompoundTag tag = stack.getOrCreateTag();
        if (component.modelData() > 0) {
            tag.putInt("CustomModelData", component.modelData());
        }
        if (component.unbreakable()) {
            tag.putBoolean("Unbreakable", true);
        }

        CompoundTag gameforge = tag.contains("gameforge", 10)
            ? tag.getCompound("gameforge")
            : new CompoundTag();
        gameforge.putString("id", project.namespace() + ":" + component.normalizedType() + ":" + component.logicalId());
        gameforge.putString("kind", component.normalizedType());
        tag.put("gameforge", gameforge);

        if (component.glow() || component.enchant() > 0) {
            ListTag enchantments = new ListTag();
            CompoundTag enchantment = new CompoundTag();
            enchantment.putString("id", "minecraft:unbreaking");
            enchantment.putShort("lvl", (short) Math.max(1, component.enchant()));
            enchantments.add(enchantment);
            tag.put("Enchantments", enchantments);
            tag.putInt("HideFlags", tag.getInt("HideFlags") | 1);
        }

        ListTag lore = new ListTag();
        if (!component.lore().isBlank()) {
            lore.add(StringTag.valueOf(Component.Serializer.toJson(
                Component.literal(component.lore()).withStyle(ChatFormatting.GRAY)
            )));
        }
        lore.add(StringTag.valueOf(Component.Serializer.toJson(
            Component.literal(project.name() + " · " + typeLabel(component)).withStyle(ChatFormatting.DARK_GRAY)
        )));
        CompoundTag display = tag.contains("display", 10) ? tag.getCompound("display") : new CompoundTag();
        display.put("Lore", lore);
        tag.put("display", display);
        return stack;
    }

    public static ItemStack ingredientStack(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            return ItemStack.EMPTY;
        }

        String id = rawId.trim();
        if (id.startsWith("#")) {
            ItemStack tagStack = new ItemStack(Items.CHEST);
            tagStack.setHoverName(Component.literal(id).withStyle(ChatFormatting.YELLOW));
            return tagStack;
        }

        Item item = resolveItem(id);
        ItemStack stack = new ItemStack(item);
        if (item == Items.BARRIER && !id.equals("minecraft:barrier")) {
            stack.setHoverName(Component.literal(id).withStyle(ChatFormatting.RED));
        }
        return stack;
    }

    public static String typeLabel(GameForgeComponent component) {
        return switch (component.normalizedType()) {
            case "weapon" -> "武器";
            case "item", "resource_item" -> "物品";
            case "food" -> "食物";
            case "tool" -> "工具";
            case "armor" -> "装备";
            case "block", "decorative_block" -> "方块";
            case "mob", "entity" -> "生物";
            case "pet" -> "宠物";
            case "npc" -> "NPC";
            case "boss" -> "Boss";
            case "recipe" -> "配方";
            case "command" -> "指令";
            case "function" -> "函数";
            case "advancement" -> "进度";
            case "concept" -> "概念草案";
            default -> component.type().isBlank() ? "内容" : component.type();
        };
    }

    public static String triggerLabel(String trigger) {
        if (trigger == null || trigger.isBlank()) return "无";
        return switch (trigger.toLowerCase(Locale.ROOT)) {
            case "right_click" -> "右键";
            case "on_hit", "hit" -> "命中";
            case "passive", "tick" -> "被动";
            case "left_click" -> "左键";
            case "on_use", "use" -> "使用";
            default -> trigger;
        };
    }

    public static String effectLabel(String effect) {
        if (effect == null || effect.isBlank() || effect.equalsIgnoreCase("none")) return "无";
        return switch (effect.toLowerCase(Locale.ROOT)) {
            case "lightning" -> "召唤闪电";
            case "fire", "burn" -> "燃烧";
            case "freeze", "frozen" -> "冻结";
            case "poison" -> "中毒";
            case "heal" -> "治疗";
            case "teleport" -> "传送";
            case "explode", "explosion" -> "爆炸";
            case "summon" -> "召唤";
            case "projectile" -> "投射物";
            default -> effect;
        };
    }

    private static ItemStack entityIcon(GameForgeComponent component) {
        String entityId = component.entityType();
        if (!entityId.isBlank()) {
            ResourceLocation location = safeLocation(entityId);
            if (location != null) {
                Optional<EntityType<?>> entityType = BuiltInRegistries.ENTITY_TYPE.getOptional(location);
                if (entityType.isPresent()) {
                    SpawnEggItem egg = SpawnEggItem.byId(entityType.get());
                    if (egg != null) {
                        return new ItemStack(egg);
                    }
                }
            }
        }
        return new ItemStack(component.bossLike() ? Items.DRAGON_HEAD : Items.SPAWNER);
    }

    private static String resolveBaseItem(GameForgeComponent component) {
        if (!component.baseItem().isBlank()) {
            return component.baseItem();
        }
        return switch (component.normalizedType()) {
            case "weapon" -> "minecraft:carrot_on_a_stick";
            case "food" -> "minecraft:apple";
            case "block", "decorative_block" -> "minecraft:item_frame";
            case "tool" -> "minecraft:iron_pickaxe";
            case "armor" -> "minecraft:iron_chestplate";
            case "recipe" -> "minecraft:crafting_table";
            case "command" -> "minecraft:command_block";
            case "function" -> "minecraft:structure_block";
            case "advancement" -> "minecraft:knowledge_book";
            case "concept" -> "minecraft:writable_book";
            default -> "minecraft:paper";
        };
    }

    private static Item resolveItem(String rawId) {
        ResourceLocation location = safeLocation(rawId);
        if (location == null) {
            return Items.BARRIER;
        }
        return BuiltInRegistries.ITEM.getOptional(location).orElse(Items.BARRIER);
    }

    private static ResourceLocation safeLocation(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            return null;
        }
        try {
            String value = rawId.contains(":") ? rawId : "minecraft:" + rawId;
            return new ResourceLocation(value);
        } catch (RuntimeException ignored) {
            return null;
        }
    }
}
