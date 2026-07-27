package ai.gameforge.runtime;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.logging.LogUtils;
import net.minecraft.commands.CommandFunction;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.fml.ModList;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.forgespi.language.IModInfo;
import net.minecraftforge.network.NetworkEvent;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.simple.SimpleChannel;
import org.slf4j.Logger;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Pattern;

@Mod(GameForgeRuntime.MOD_ID)
public final class GameForgeRuntime {
    public static final String MOD_ID = "gameforge_runtime";
    public static final String VERSION = "1.20.1-0.2.0";
    public static final Logger LOGGER = LogUtils.getLogger();

    private static final String PROTOCOL = "2";
    private static final Pattern SAFE_NAMESPACE = Pattern.compile("^[a-z0-9_.-]{1,64}$");
    private static final Pattern SAFE_COMPONENT_ID = Pattern.compile("^[a-z0-9_./-]{1,96}$");

    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(
        new ResourceLocation(MOD_ID, "main"),
        () -> PROTOCOL,
        PROTOCOL::equals,
        PROTOCOL::equals
    );

    public GameForgeRuntime() {
        int packetId = 0;
        CHANNEL.registerMessage(
            packetId++,
            RunProjectActionPacket.class,
            RunProjectActionPacket::encode,
            RunProjectActionPacket::decode,
            RunProjectActionPacket::handle
        );
        CHANNEL.registerMessage(
            packetId,
            RunComponentActionPacket.class,
            RunComponentActionPacket::encode,
            RunComponentActionPacket::decode,
            RunComponentActionPacket::handle
        );
        LOGGER.info("GameForge Runtime {} initialized", VERSION);
    }

    public static void sendAction(String namespace, ProjectAction action) {
        CHANNEL.sendToServer(new RunProjectActionPacket(namespace, action));
    }

    public static void sendComponentAction(String namespace, String componentId, ComponentAction action) {
        CHANNEL.sendToServer(new RunComponentActionPacket(namespace, componentId, action));
    }

    public enum ProjectAction {
        MENU("menu", "项目菜单"),
        GET_ALL("get_all", "获取全部"),
        SPAWN_ALL("spawn_all", "召唤全部"),
        DOCTOR("doctor", "兼容诊断"),
        CLEANUP("cleanup", "清理生成物");

        private final String functionPath;
        private final String displayName;

        ProjectAction(String functionPath, String displayName) {
            this.functionPath = functionPath;
            this.displayName = displayName;
        }

        public String functionPath() {
            return functionPath;
        }

        public String displayName() {
            return displayName;
        }
    }

    public enum ComponentAction {
        GIVE("获取"),
        SPAWN("召唤");

        private final String displayName;

        ComponentAction(String displayName) {
            this.displayName = displayName;
        }

        public String displayName() {
            return displayName;
        }
    }

    public record RunProjectActionPacket(String namespace, ProjectAction action) {
        private static void encode(RunProjectActionPacket message, FriendlyByteBuf buffer) {
            buffer.writeUtf(message.namespace, 64);
            buffer.writeEnum(message.action);
        }

        private static RunProjectActionPacket decode(FriendlyByteBuf buffer) {
            return new RunProjectActionPacket(buffer.readUtf(64), buffer.readEnum(ProjectAction.class));
        }

        private static void handle(RunProjectActionPacket message, Supplier<NetworkEvent.Context> contextSupplier) {
            NetworkEvent.Context context = contextSupplier.get();
            context.enqueueWork(() -> runProjectAction(message, context.getSender()));
            context.setPacketHandled(true);
        }
    }

    public record RunComponentActionPacket(String namespace, String componentId, ComponentAction action) {
        private static void encode(RunComponentActionPacket message, FriendlyByteBuf buffer) {
            buffer.writeUtf(message.namespace, 64);
            buffer.writeUtf(message.componentId, 96);
            buffer.writeEnum(message.action);
        }

        private static RunComponentActionPacket decode(FriendlyByteBuf buffer) {
            return new RunComponentActionPacket(
                buffer.readUtf(64),
                buffer.readUtf(96),
                buffer.readEnum(ComponentAction.class)
            );
        }

        private static void handle(RunComponentActionPacket message, Supplier<NetworkEvent.Context> contextSupplier) {
            NetworkEvent.Context context = contextSupplier.get();
            context.enqueueWork(() -> runComponentAction(message, context.getSender()));
            context.setPacketHandled(true);
        }
    }

    private static void runProjectAction(RunProjectActionPacket message, ServerPlayer sender) {
        if (sender == null || message.action == null || !SAFE_NAMESPACE.matcher(message.namespace).matches()) {
            return;
        }

        Optional<GameForgeProject> project = ProjectCatalog.find(message.namespace);
        if (project.isEmpty()) {
            sendError(sender, "message.gameforge_runtime.missing_project", message.namespace);
            return;
        }

        ResourceLocation functionId = new ResourceLocation(
            message.namespace,
            "gameforge/" + message.action.functionPath()
        );
        if (!executeFunction(sender, functionId)) {
            sendError(sender, "message.gameforge_runtime.missing_function", functionId.toString());
            return;
        }

        sender.sendSystemMessage(Component.translatable(
            "message.gameforge_runtime.executed",
            message.action.displayName()
        ).withStyle(style -> style.withColor(0x77E2AC)));
    }

    private static void runComponentAction(RunComponentActionPacket message, ServerPlayer sender) {
        if (sender == null
            || message.action == null
            || !SAFE_NAMESPACE.matcher(message.namespace).matches()
            || !SAFE_COMPONENT_ID.matcher(message.componentId).matches()) {
            return;
        }

        Optional<GameForgeProject> projectResult = ProjectCatalog.find(message.namespace);
        if (projectResult.isEmpty()) {
            sendError(sender, "message.gameforge_runtime.missing_project", message.namespace);
            return;
        }

        Optional<GameForgeComponent> componentResult = projectResult.get().components().stream()
            .filter(component -> component.logicalId().equals(message.componentId))
            .findFirst();
        if (componentResult.isEmpty()) {
            sendError(sender, "message.gameforge_runtime.missing_component", message.componentId);
            return;
        }

        GameForgeComponent component = componentResult.get();
        for (String path : component.functionCandidates(message.action)) {
            ResourceLocation functionId = new ResourceLocation(message.namespace, path);
            if (executeFunction(sender, functionId)) {
                sender.sendSystemMessage(Component.translatable(
                    "message.gameforge_runtime.component_executed",
                    message.action.displayName(),
                    component.name()
                ).withStyle(style -> style.withColor(0x77E2AC)));
                return;
            }
        }

        sendError(sender, "message.gameforge_runtime.missing_component_function", component.name());
    }

    private static boolean executeFunction(ServerPlayer sender, ResourceLocation functionId) {
        Optional<CommandFunction> function = sender.getServer().getFunctions().get(functionId);
        if (function.isEmpty()) {
            return false;
        }

        CommandSourceStack source = sender.createCommandSourceStack()
            .withPermission(2)
            .withSuppressedOutput();
        sender.getServer().getFunctions().execute(function.get(), source);
        return true;
    }

    private static void sendError(ServerPlayer sender, String key, Object argument) {
        sender.sendSystemMessage(Component.translatable(key, argument)
            .withStyle(style -> style.withColor(0xFF8D9A)));
    }

    public record GameForgeComponent(
        String componentId,
        String type,
        String name,
        String logicalId,
        String lore,
        String baseItem,
        String entityType,
        String visual,
        int modelData,
        String color,
        String trigger,
        String effect,
        double damage,
        double attackSpeed,
        int cooldown,
        int range,
        int power,
        int enchant,
        double health,
        double armor,
        int hunger,
        double saturation,
        boolean unbreakable,
        boolean glow,
        boolean recipeEnabled,
        boolean particles,
        List<String> recipeGrid
    ) {
        public GameForgeComponent {
            recipeGrid = List.copyOf(recipeGrid == null ? List.of() : recipeGrid);
        }

        public boolean itemLike() {
            return switch (normalizedType()) {
                case "weapon", "item", "food", "resource_item", "block", "decorative_block", "tool", "armor" -> true;
                default -> false;
            };
        }

        public boolean entityLike() {
            return switch (normalizedType()) {
                case "mob", "entity", "boss", "pet", "npc" -> true;
                default -> false;
            };
        }

        public boolean bossLike() {
            return normalizedType().equals("boss");
        }

        public boolean hasRecipe() {
            return recipeEnabled && recipeGrid.stream().anyMatch(value -> value != null && !value.isBlank());
        }

        public String normalizedType() {
            return type == null ? "unknown" : type.toLowerCase(Locale.ROOT);
        }

        public String searchableText(String projectName, String namespace) {
            return String.join(" ",
                safe(projectName), safe(namespace), safe(name), safe(type), safe(logicalId), safe(lore),
                safe(baseItem), safe(entityType), safe(visual), safe(trigger), safe(effect)
            ).toLowerCase(Locale.ROOT);
        }

        public List<String> functionCandidates(ComponentAction action) {
            LinkedHashSet<String> paths = new LinkedHashSet<>();
            String id = logicalId;
            String typeName = normalizedType();
            if (action == ComponentAction.GIVE) {
                paths.add(typeName + "/" + id + "/give");
                if (typeName.equals("decorative_block")) {
                    paths.add("block/" + id + "/give");
                }
                if (typeName.equals("resource_item")) {
                    paths.add("item/" + id + "/give");
                }
                if (typeName.equals("food")) {
                    paths.add("item/" + id + "/give");
                }
                paths.add("weapon/" + id + "/give");
                paths.add("item/" + id + "/give");
                paths.add("block/" + id + "/give");
            } else {
                paths.add(typeName + "/" + id + "/spawn");
                paths.add("mob/" + id + "/spawn");
                paths.add("entity/" + id + "/spawn");
                paths.add("boss/" + id + "/spawn");
                paths.add(typeName + "/" + id + "/summon");
            }
            return List.copyOf(paths);
        }

        private static String safe(String value) {
            return value == null ? "" : value;
        }
    }

    public record GameForgeProject(
        String id,
        String name,
        String namespace,
        String description,
        List<GameForgeComponent> components,
        int componentCount,
        int weapons,
        int items,
        int blocks,
        int entities,
        int bosses,
        String sourceModId
    ) {
        public GameForgeProject {
            components = List.copyOf(components == null ? List.of() : components);
        }

        public String compactSummary() {
            List<String> parts = new ArrayList<>();
            if (weapons > 0) parts.add(weapons + " 武器");
            if (items > 0) parts.add(items + " 物品");
            if (blocks > 0) parts.add(blocks + " 方块");
            if (entities > 0) parts.add(entities + " 生物");
            if (bosses > 0) parts.add(bosses + " Boss");
            return parts.isEmpty() ? componentCount + " 个组件" : String.join(" · ", parts);
        }
    }

    public static final class ProjectCatalog {
        private static final String[] METADATA_PATH = {"META-INF", "gameforge", "project.json"};

        private ProjectCatalog() {
        }

        public static Optional<GameForgeProject> find(String namespace) {
            return scan().stream()
                .filter(project -> project.namespace().equals(namespace))
                .findFirst();
        }

        public static List<GameForgeProject> scan() {
            List<GameForgeProject> result = new ArrayList<>();
            Set<String> visitedFiles = new HashSet<>();

            for (IModInfo modInfo : ModList.get().getMods()) {
                try {
                    Path metadataPath = modInfo.getOwningFile().getFile().findResource(METADATA_PATH);
                    if (!Files.isRegularFile(metadataPath)) {
                        continue;
                    }
                    String uniquePath = metadataPath.toAbsolutePath().normalize().toString();
                    if (!visitedFiles.add(uniquePath)) {
                        continue;
                    }

                    try (Reader reader = Files.newBufferedReader(metadataPath, StandardCharsets.UTF_8)) {
                        JsonElement root = JsonParser.parseReader(reader);
                        if (!root.isJsonObject()) {
                            continue;
                        }
                        GameForgeProject project = parseProject(root.getAsJsonObject(), modInfo);
                        if (project != null) {
                            result.add(project);
                        }
                    }
                } catch (Exception exception) {
                    LOGGER.warn("Could not read GameForge project metadata from mod {}", modInfo.getModId(), exception);
                }
            }

            result.sort(Comparator.comparing(GameForgeProject::name, String.CASE_INSENSITIVE_ORDER));
            return List.copyOf(result);
        }

        private static GameForgeProject parseProject(JsonObject json, IModInfo modInfo) {
            String namespace = string(json, "namespace", "").toLowerCase(Locale.ROOT);
            if (!SAFE_NAMESPACE.matcher(namespace).matches()) {
                LOGGER.warn("Ignoring GameForge project with invalid namespace: {}", namespace);
                return null;
            }

            String id = string(json, "id", modInfo.getModId() + ":" + namespace);
            String name = string(json, "name", modInfo.getDisplayName());
            String description = string(json, "description", "使用 GameForge 创建的 Minecraft 作品");

            List<GameForgeComponent> components = new ArrayList<>();
            JsonArray componentArray = json.has("components") && json.get("components").isJsonArray()
                ? json.getAsJsonArray("components")
                : new JsonArray();
            for (JsonElement element : componentArray) {
                if (!element.isJsonObject()) {
                    continue;
                }
                GameForgeComponent component = parseComponent(element.getAsJsonObject());
                if (component != null) {
                    components.add(component);
                }
            }

            int weapons = 0;
            int items = 0;
            int blocks = 0;
            int entities = 0;
            int bosses = 0;
            for (GameForgeComponent component : components) {
                switch (component.normalizedType()) {
                    case "weapon" -> weapons++;
                    case "item", "food", "resource_item", "tool", "armor" -> items++;
                    case "block", "decorative_block" -> blocks++;
                    case "mob", "entity", "pet", "npc" -> entities++;
                    case "boss" -> bosses++;
                    default -> {
                    }
                }
            }

            return new GameForgeProject(
                id,
                name,
                namespace,
                description,
                components,
                components.size(),
                weapons,
                items,
                blocks,
                entities,
                bosses,
                modInfo.getModId()
            );
        }

        private static GameForgeComponent parseComponent(JsonObject componentJson) {
            String type = string(componentJson, "type", "unknown").toLowerCase(Locale.ROOT);
            JsonObject spec = componentJson.has("spec") && componentJson.get("spec").isJsonObject()
                ? componentJson.getAsJsonObject("spec")
                : new JsonObject();

            String componentId = string(componentJson, "id", "");
            String logicalId = firstString(spec, componentJson, "id", "logicalId", "slug");
            if (logicalId.isBlank()) {
                logicalId = sanitizeLogicalId(string(componentJson, "name", type));
            }
            if (!SAFE_COMPONENT_ID.matcher(logicalId).matches()) {
                LOGGER.warn("Ignoring GameForge component with invalid logical ID: {}", logicalId);
                return null;
            }

            String name = firstString(spec, componentJson, "name", "displayName", "title");
            if (name.isBlank()) {
                name = logicalId;
            }
            String lore = firstString(spec, componentJson, "lore", "description", "tooltip");
            String baseItem = firstString(spec, componentJson, "base", "baseItem", "item", "material", "baseBlock");
            String entityType = firstString(spec, componentJson, "entity", "entityType", "baseEntity", "mob");

            return new GameForgeComponent(
                componentId,
                type,
                name,
                logicalId,
                lore,
                baseItem,
                entityType,
                string(spec, "visual", ""),
                integer(spec, "modelData", integer(spec, "customModelData", 0)),
                string(spec, "color", "#69d8ff"),
                string(spec, "trigger", ""),
                string(spec, "effect", ""),
                decimal(spec, "damage", 0),
                decimal(spec, "attackSpeed", 0),
                integer(spec, "cooldown", 0),
                integer(spec, "range", 0),
                integer(spec, "power", 0),
                integer(spec, "enchant", 0),
                decimal(spec, "health", 0),
                decimal(spec, "armor", 0),
                integer(spec, "hunger", integer(spec, "nutrition", 0)),
                decimal(spec, "saturation", 0),
                bool(spec, "unbreakable", false),
                bool(spec, "glow", false),
                bool(spec, "recipeEnabled", hasRecipeGrid(spec)),
                bool(spec, "particles", false),
                recipeGrid(spec)
            );
        }

        private static boolean hasRecipeGrid(JsonObject spec) {
            return spec.has("recipeGrid") && spec.get("recipeGrid").isJsonArray();
        }

        private static List<String> recipeGrid(JsonObject spec) {
            JsonArray array = null;
            for (String key : List.of("recipeGrid", "grid", "ingredients")) {
                if (spec.has(key) && spec.get(key).isJsonArray()) {
                    array = spec.getAsJsonArray(key);
                    break;
                }
            }
            if (array == null) {
                return List.of();
            }
            List<String> values = new ArrayList<>();
            for (JsonElement element : array) {
                if (element.isJsonPrimitive()) {
                    values.add(element.getAsString());
                } else if (element.isJsonObject()) {
                    JsonObject object = element.getAsJsonObject();
                    values.add(firstString(object, object, "item", "tag", "id"));
                } else {
                    values.add("");
                }
            }
            while (values.size() < 9) {
                values.add("");
            }
            return List.copyOf(values.subList(0, Math.min(9, values.size())));
        }

        private static String firstString(JsonObject primary, JsonObject secondary, String... keys) {
            for (String key : keys) {
                String value = string(primary, key, "");
                if (!value.isBlank()) {
                    return value;
                }
            }
            for (String key : keys) {
                String value = string(secondary, key, "");
                if (!value.isBlank()) {
                    return value;
                }
            }
            return "";
        }

        private static String sanitizeLogicalId(String value) {
            String sanitized = value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_./-]+", "_")
                .replaceAll("^_+|_+$", "");
            return sanitized.isBlank() ? "component" : sanitized;
        }

        private static String string(JsonObject object, String key, String fallback) {
            if (object == null || !object.has(key) || !object.get(key).isJsonPrimitive()) {
                return fallback;
            }
            try {
                String value = object.get(key).getAsString().trim();
                return value.isEmpty() ? fallback : value;
            } catch (RuntimeException ignored) {
                return fallback;
            }
        }

        private static int integer(JsonObject object, String key, int fallback) {
            if (object == null || !object.has(key) || !object.get(key).isJsonPrimitive()) {
                return fallback;
            }
            try {
                return object.get(key).getAsInt();
            } catch (RuntimeException ignored) {
                return fallback;
            }
        }

        private static double decimal(JsonObject object, String key, double fallback) {
            if (object == null || !object.has(key) || !object.get(key).isJsonPrimitive()) {
                return fallback;
            }
            try {
                return object.get(key).getAsDouble();
            } catch (RuntimeException ignored) {
                return fallback;
            }
        }

        private static boolean bool(JsonObject object, String key, boolean fallback) {
            if (object == null || !object.has(key) || !object.get(key).isJsonPrimitive()) {
                return fallback;
            }
            try {
                return object.get(key).getAsBoolean();
            } catch (RuntimeException ignored) {
                return fallback;
            }
        }
    }
}
