package ai.gameforge.runtime;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.Tag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.MobType;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.animal.TamableAnimal;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.event.entity.living.LivingDamageEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.ModList;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.forgespi.language.IModInfo;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Applies precise on-hit mechanics to the actual entity damaged by a player.
 *
 * A datapack advancement can detect that a player hurt an entity, but its
 * reward function does not receive the exact victim. Runtime 0.3.0 reads the
 * advanced fields preserved in each GameForge project JAR and handles the
 * real Forge damage event instead of selecting a nearby entity heuristically.
 */
@Mod.EventBusSubscriber(modid = GameForgeRuntime.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class AdvancedWeaponHandler {
    private static final String[] METADATA_PATH = {"META-INF", "gameforge", "project.json"};
    private static final Set<String> AQUATIC_TYPES = Set.of(
        "cod", "salmon", "pufferfish", "tropical_fish", "squid", "glow_squid",
        "dolphin", "guardian", "elder_guardian", "drowned", "turtle", "axolotl"
    );
    private static final Set<String> ILLAGER_TYPES = Set.of(
        "pillager", "vindicator", "evoker", "illusioner", "ravager", "witch"
    );
    private static final Set<String> BOSS_TYPES = Set.of("ender_dragon", "wither");
    private static volatile Map<String, AdvancedWeaponSpec> weaponCache;

    private AdvancedWeaponHandler() {
    }

    @SubscribeEvent
    public static void onLivingDamage(LivingDamageEvent event) {
        LivingEntity target = event.getEntity();
        if (target.level().isClientSide() || event.getAmount() <= 0) return;
        if (!(event.getSource().getEntity() instanceof ServerPlayer attacker)) return;
        if (event.getSource().getDirectEntity() != attacker) return;

        WeaponKey key = readWeaponKey(attacker.getMainHandItem());
        if (key == null) return;
        AdvancedWeaponSpec weapon = weaponIndex().get(key.cacheKey());
        if (weapon == null || !weapon.preciseOnHit()) return;
        if (!matchesTarget(weapon, target, attacker)) return;
        if (!cooldownReady(weapon, key, attacker)) return;

        if (!applyEffect(weapon, event, attacker, target)) return;
        startCooldown(weapon, key, attacker);
        showFeedback(attacker, weapon, target);
    }

    static void clearCache() {
        weaponCache = null;
    }

    private static Map<String, AdvancedWeaponSpec> weaponIndex() {
        Map<String, AdvancedWeaponSpec> current = weaponCache;
        if (current != null) return current;
        synchronized (AdvancedWeaponHandler.class) {
            current = weaponCache;
            if (current != null) return current;
            Map<String, AdvancedWeaponSpec> built = new HashMap<>();
            for (IModInfo modInfo : ModList.get().getMods()) {
                try {
                    Path metadataPath = modInfo.getOwningFile().getFile().findResource(METADATA_PATH);
                    if (!Files.isRegularFile(metadataPath)) continue;
                    try (Reader reader = Files.newBufferedReader(metadataPath, StandardCharsets.UTF_8)) {
                        JsonElement root = JsonParser.parseReader(reader);
                        if (!root.isJsonObject()) continue;
                        readProject(root.getAsJsonObject(), built);
                    }
                } catch (Exception exception) {
                    GameForgeRuntime.LOGGER.warn("Could not index advanced weapon metadata from mod {}", modInfo.getModId(), exception);
                }
            }
            current = Map.copyOf(built);
            weaponCache = current;
            GameForgeRuntime.LOGGER.info("Indexed {} GameForge weapons for precise hit mechanics", current.size());
            return current;
        }
    }

    private static void readProject(JsonObject project, Map<String, AdvancedWeaponSpec> output) {
        String namespace = string(project, "namespace", "").toLowerCase(Locale.ROOT);
        if (!namespace.matches("^[a-z0-9_.-]{1,64}$")) return;
        JsonArray components = project.has("components") && project.get("components").isJsonArray()
            ? project.getAsJsonArray("components")
            : new JsonArray();
        for (JsonElement element : components) {
            if (!element.isJsonObject()) continue;
            JsonObject component = element.getAsJsonObject();
            if (!"weapon".equalsIgnoreCase(string(component, "type", ""))) continue;
            JsonObject spec = component.has("spec") && component.get("spec").isJsonObject()
                ? component.getAsJsonObject("spec")
                : new JsonObject();
            AdvancedWeaponSpec weapon = parseWeapon(namespace, component, spec);
            if (weapon != null) output.put(new WeaponKey(namespace, weapon.logicalId()).cacheKey(), weapon);
        }
    }

    private static AdvancedWeaponSpec parseWeapon(String namespace, JsonObject component, JsonObject spec) {
        String logicalId = firstString(spec, component, "id", "logicalId", "slug");
        if (!logicalId.matches("^[a-z0-9_./-]{1,96}$")) return null;
        String name = firstString(spec, component, "name", "displayName", "title");
        if (name.isBlank()) name = logicalId;
        String effect = string(spec, "runtimeEffect", string(spec, "effect", "none")).toLowerCase(Locale.ROOT);
        return new AdvancedWeaponSpec(
            namespace,
            logicalId,
            name,
            string(spec, "trigger", ""),
            effect,
            string(spec, "targetGroup", "any").toLowerCase(Locale.ROOT),
            string(spec, "targetEntity", ""),
            string(spec, "targetLabel", ""),
            string(spec, "mechanicSummary", ""),
            bool(spec, "affectPlayers", false),
            bool(spec, "affectTamed", false),
            bool(spec, "runtimeRequired", false),
            integer(spec, "mechanicVersion", 0),
            decimal(spec, "damageMultiplier", 1),
            decimal(spec, "bonusDamage", 0),
            decimal(spec, "executeThreshold", 0.2),
            decimal(spec, "lifestealPercent", 0),
            decimal(spec, "knockbackStrength", 0),
            integer(spec, "effectDuration", 0),
            integer(spec, "cooldown", 0),
            integer(spec, "power", 1)
        );
    }

    private static WeaponKey readWeaponKey(ItemStack stack) {
        if (stack.isEmpty() || !stack.hasTag()) return null;
        CompoundTag root = stack.getTag();
        if (root == null || !root.contains("gameforge", Tag.TAG_COMPOUND)) return null;
        String rawId = root.getCompound("gameforge").getString("id");
        String[] parts = rawId.split(":", 3);
        if (parts.length != 3 || !"weapon".equals(parts[1])) return null;
        if (!parts[0].matches("^[a-z0-9_.-]{1,64}$") || !parts[2].matches("^[a-z0-9_./-]{1,96}$")) return null;
        return new WeaponKey(parts[0], parts[2]);
    }

    private static boolean matchesTarget(AdvancedWeaponSpec weapon, LivingEntity target, ServerPlayer attacker) {
        if (target == attacker) return false;
        if (target instanceof Player && !weapon.affectPlayers()) return false;
        if (target instanceof TamableAnimal tame && tame.isTame() && tame.isOwnedBy(attacker) && !weapon.affectTamed()) return false;

        ResourceLocation targetId = BuiltInRegistries.ENTITY_TYPE.getKey(target.getType());
        if (!weapon.targetEntity().isBlank()) return weapon.targetEntity().equals(targetId.toString());

        return switch (weapon.targetGroup()) {
            case "undead" -> target.getMobType() == MobType.UNDEAD;
            case "arthropod" -> target.getMobType() == MobType.ARTHROPOD;
            case "hostile" -> target instanceof Enemy;
            case "aquatic" -> AQUATIC_TYPES.contains(targetId.getPath());
            case "illager" -> ILLAGER_TYPES.contains(targetId.getPath());
            case "animal" -> target instanceof Animal;
            case "boss" -> BOSS_TYPES.contains(targetId.getPath());
            case "player" -> target instanceof Player;
            case "specific" -> false;
            default -> !(target instanceof Player) || weapon.affectPlayers();
        };
    }

    private static boolean applyEffect(AdvancedWeaponSpec weapon, LivingDamageEvent event, ServerPlayer attacker, LivingEntity target) {
        float amount = event.getAmount();
        int power = Math.max(1, weapon.power());
        int durationSeconds = weapon.effectDuration() > 0 ? weapon.effectDuration() : Math.max(2, power * 2);

        switch (weapon.effect()) {
            case "instant_kill" -> event.setAmount(lethalDamage(target, amount));
            case "execute" -> {
                double threshold = clamp(weapon.executeThreshold(), 0.01, 1.0);
                double remaining = Math.max(0.0, target.getHealth() - amount);
                if (remaining / Math.max(1.0, target.getMaxHealth()) > threshold) return false;
                event.setAmount(lethalDamage(target, amount));
            }
            case "damage_multiplier" -> event.setAmount((float) (amount * clamp(weapon.damageMultiplier(), 0.1, 100.0)));
            case "bonus_damage" -> event.setAmount((float) (amount + clamp(weapon.bonusDamage(), 0.0, 2048.0)));
            case "lifesteal" -> attacker.heal((float) Math.max(0.5, amount * clamp(weapon.lifestealPercent(), 0.01, 1.0)));
            case "knockback" -> target.knockback(clamp(weapon.knockbackStrength(), 0.1, 10.0), attacker.getX() - target.getX(), attacker.getZ() - target.getZ());
            case "wither" -> target.addEffect(new MobEffectInstance(MobEffects.WITHER, durationSeconds * 20, Math.min(4, Math.max(0, power / 2)), false, true));
            case "fire" -> target.setSecondsOnFire(durationSeconds);
            case "poison" -> target.addEffect(new MobEffectInstance(MobEffects.POISON, durationSeconds * 20, Math.min(4, Math.max(0, power / 2)), false, true));
            case "freeze" -> target.setTicksFrozen(Math.max(target.getTicksFrozen(), Math.min(300, durationSeconds * 20)));
            case "lightning" -> {
                event.setAmount(amount + Math.max(2.0F, power * 2.0F));
                visualLightning(attacker.serverLevel(), attacker, target);
            }
            case "explosion" -> {
                event.setAmount(amount + Math.max(2.0F, power * 2.5F));
                safeExplosionVisual(attacker.serverLevel(), target, power);
            }
            default -> {
                return false;
            }
        }
        return true;
    }

    private static float lethalDamage(LivingEntity target, float currentAmount) {
        return Math.max(currentAmount, target.getHealth() + target.getAbsorptionAmount() + target.getMaxHealth() + 1024.0F);
    }

    private static void visualLightning(ServerLevel level, ServerPlayer attacker, LivingEntity target) {
        var bolt = net.minecraft.world.entity.EntityType.LIGHTNING_BOLT.create(level);
        if (bolt == null) return;
        bolt.setPos(target.getX(), target.getY(), target.getZ());
        bolt.setCause(attacker);
        bolt.setVisualOnly(true);
        level.addFreshEntity(bolt);
    }

    private static void safeExplosionVisual(ServerLevel level, LivingEntity target, int power) {
        int count = Math.min(40, 12 + power * 4);
        level.sendParticles(ParticleTypes.EXPLOSION, target.getX(), target.getY(0.5), target.getZ(), count, 0.35, 0.35, 0.35, 0.02);
        level.playSound(null, target.blockPosition(), SoundEvents.GENERIC_EXPLODE, SoundSource.PLAYERS, 0.8F, 1.1F);
    }

    private static boolean cooldownReady(AdvancedWeaponSpec weapon, WeaponKey key, ServerPlayer player) {
        return player.serverLevel().getGameTime() >= player.getPersistentData().getLong(cooldownKey(key));
    }

    private static void startCooldown(AdvancedWeaponSpec weapon, WeaponKey key, ServerPlayer player) {
        long ticks = Math.max(0L, weapon.cooldown() * 20L);
        if (ticks > 0) player.getPersistentData().putLong(cooldownKey(key), player.serverLevel().getGameTime() + ticks);
    }

    private static String cooldownKey(WeaponKey key) {
        return "gameforgeRuntimeCooldown_" + Integer.toUnsignedString(key.cacheKey().hashCode(), 36);
    }

    private static void showFeedback(ServerPlayer attacker, AdvancedWeaponSpec weapon, LivingEntity target) {
        String summary = weapon.mechanicSummary().isBlank() ? weapon.effect() : weapon.mechanicSummary();
        attacker.displayClientMessage(Component.translatable(
            "message.gameforge_runtime.weapon_triggered",
            weapon.name(),
            summary,
            target.getDisplayName()
        ), true);
    }

    private static String firstString(JsonObject primary, JsonObject secondary, String... keys) {
        for (String key : keys) {
            String value = string(primary, key, "");
            if (!value.isBlank()) return value;
        }
        for (String key : keys) {
            String value = string(secondary, key, "");
            if (!value.isBlank()) return value;
        }
        return "";
    }

    private static String string(JsonObject object, String key, String fallback) {
        if (object == null || !object.has(key) || !object.get(key).isJsonPrimitive()) return fallback;
        try {
            String value = object.get(key).getAsString().trim();
            return value.isEmpty() ? fallback : value;
        } catch (RuntimeException ignored) {
            return fallback;
        }
    }

    private static int integer(JsonObject object, String key, int fallback) {
        if (object == null || !object.has(key) || !object.get(key).isJsonPrimitive()) return fallback;
        try { return object.get(key).getAsInt(); }
        catch (RuntimeException ignored) { return fallback; }
    }

    private static double decimal(JsonObject object, String key, double fallback) {
        if (object == null || !object.has(key) || !object.get(key).isJsonPrimitive()) return fallback;
        try { return object.get(key).getAsDouble(); }
        catch (RuntimeException ignored) { return fallback; }
    }

    private static boolean bool(JsonObject object, String key, boolean fallback) {
        if (object == null || !object.has(key) || !object.get(key).isJsonPrimitive()) return fallback;
        try { return object.get(key).getAsBoolean(); }
        catch (RuntimeException ignored) { return fallback; }
    }

    private static double clamp(double value, double min, double max) {
        if (!Double.isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

    private record WeaponKey(String namespace, String logicalId) {
        String cacheKey() { return namespace + ":" + logicalId; }
    }

    private record AdvancedWeaponSpec(
        String namespace,
        String logicalId,
        String name,
        String trigger,
        String effect,
        String targetGroup,
        String targetEntity,
        String targetLabel,
        String mechanicSummary,
        boolean affectPlayers,
        boolean affectTamed,
        boolean runtimeRequired,
        int mechanicVersion,
        double damageMultiplier,
        double bonusDamage,
        double executeThreshold,
        double lifestealPercent,
        double knockbackStrength,
        int effectDuration,
        int cooldown,
        int power
    ) {
        boolean preciseOnHit() {
            return runtimeRequired && mechanicVersion >= 1 && "on_hit".equalsIgnoreCase(trigger)
                && !effect.isBlank() && !"none".equalsIgnoreCase(effect);
        }
    }
}
