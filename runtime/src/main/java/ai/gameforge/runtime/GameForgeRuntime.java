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
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Pattern;

@Mod(GameForgeRuntime.MOD_ID)
public final class GameForgeRuntime {
    public static final String MOD_ID = "gameforge_runtime";
    public static final String VERSION = "1.20.1-0.1.0";
    public static final Logger LOGGER = LogUtils.getLogger();

    private static final String PROTOCOL = "1";
    private static final Pattern SAFE_NAMESPACE = Pattern.compile("^[a-z0-9_.-]{1,64}$");

    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(
        new ResourceLocation(MOD_ID, "main"),
        () -> PROTOCOL,
        PROTOCOL::equals,
        PROTOCOL::equals
    );

    public GameForgeRuntime() {
        CHANNEL.registerMessage(
            0,
            RunProjectActionPacket.class,
            RunProjectActionPacket::encode,
            RunProjectActionPacket::decode,
            RunProjectActionPacket::handle
        );
        LOGGER.info("GameForge Runtime {} initialized", VERSION);
    }

    public static void sendAction(String namespace, ProjectAction action) {
        CHANNEL.sendToServer(new RunProjectActionPacket(namespace, action));
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
            context.enqueueWork(() -> runOnServer(message, context.getSender()));
            context.setPacketHandled(true);
        }

        private static void runOnServer(RunProjectActionPacket message, ServerPlayer sender) {
            if (sender == null || message.action == null || !SAFE_NAMESPACE.matcher(message.namespace).matches()) {
                return;
            }

            Optional<GameForgeProject> project = ProjectCatalog.scan().stream()
                .filter(candidate -> candidate.namespace().equals(message.namespace))
                .findFirst();
            if (project.isEmpty()) {
                sender.sendSystemMessage(Component.translatable(
                    "message.gameforge_runtime.missing_project",
                    message.namespace
                ).withStyle(style -> style.withColor(0xFF8D9A)));
                return;
            }

            ResourceLocation functionId = new ResourceLocation(
                message.namespace,
                "gameforge/" + message.action.functionPath()
            );
            Optional<CommandFunction> function = sender.getServer().getFunctions().get(functionId);
            if (function.isEmpty()) {
                sender.sendSystemMessage(Component.translatable(
                    "message.gameforge_runtime.missing_function",
                    functionId.toString()
                ).withStyle(style -> style.withColor(0xFF8D9A)));
                return;
            }

            CommandSourceStack source = sender.createCommandSourceStack()
                .withPermission(2)
                .withSuppressedOutput();
            sender.getServer().getFunctions().execute(function.get(), source);
            sender.sendSystemMessage(Component.translatable(
                "message.gameforge_runtime.executed",
                message.action.displayName()
            ).withStyle(style -> style.withColor(0x77E2AC)));
        }
    }

    public record GameForgeProject(
        String id,
        String name,
        String namespace,
        String description,
        int componentCount,
        int weapons,
        int items,
        int blocks,
        int entities,
        int bosses,
        String sourceModId
    ) {
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

            int weapons = 0;
            int items = 0;
            int blocks = 0;
            int entities = 0;
            int bosses = 0;
            int total = 0;

            JsonArray components = json.has("components") && json.get("components").isJsonArray()
                ? json.getAsJsonArray("components")
                : new JsonArray();
            for (JsonElement element : components) {
                if (!element.isJsonObject()) {
                    continue;
                }
                total++;
                String type = string(element.getAsJsonObject(), "type", "").toLowerCase(Locale.ROOT);
                switch (type) {
                    case "weapon" -> weapons++;
                    case "item", "food", "resource_item" -> items++;
                    case "block", "decorative_block" -> blocks++;
                    case "mob", "entity" -> entities++;
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
                total,
                weapons,
                items,
                blocks,
                entities,
                bosses,
                modInfo.getModId()
            );
        }

        private static String string(JsonObject object, String key, String fallback) {
            if (!object.has(key) || !object.get(key).isJsonPrimitive()) {
                return fallback;
            }
            String value = object.get(key).getAsString().trim();
            return value.isEmpty() ? fallback : value;
        }
    }
}
