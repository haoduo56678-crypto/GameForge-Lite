package ai.gameforge.runtime.client;

import ai.gameforge.runtime.GameForgeRuntime;
import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RegisterKeyMappingsEvent;
import net.minecraftforge.client.settings.KeyConflictContext;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.lwjgl.glfw.GLFW;

public final class ClientRuntime {
    private static final int COMPACT_WIDTH_THRESHOLD = 760;
    private static final int COMPACT_HEIGHT_THRESHOLD = 430;

    private static final KeyMapping OPEN_DASHBOARD = new KeyMapping(
        "key.gameforge_runtime.open",
        KeyConflictContext.IN_GAME,
        InputConstants.Type.KEYSYM,
        GLFW.GLFW_KEY_G,
        "key.categories.gameforge_runtime"
    );

    private ClientRuntime() {
    }

    @Mod.EventBusSubscriber(modid = GameForgeRuntime.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.MOD)
    public static final class ModEvents {
        private ModEvents() {
        }

        @SubscribeEvent
        public static void registerKeys(RegisterKeyMappingsEvent event) {
            event.register(OPEN_DASHBOARD);
        }
    }

    @Mod.EventBusSubscriber(modid = GameForgeRuntime.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.FORGE)
    public static final class ForgeEvents {
        private ForgeEvents() {
        }

        @SubscribeEvent
        public static void clientTick(TickEvent.ClientTickEvent event) {
            if (event.phase != TickEvent.Phase.END) {
                return;
            }
            while (OPEN_DASHBOARD.consumeClick()) {
                Minecraft minecraft = Minecraft.getInstance();
                if (minecraft.player != null && minecraft.level != null) {
                    int scaledWidth = minecraft.getWindow().getGuiScaledWidth();
                    int scaledHeight = minecraft.getWindow().getGuiScaledHeight();
                    boolean compact = scaledWidth < COMPACT_WIDTH_THRESHOLD || scaledHeight < COMPACT_HEIGHT_THRESHOLD;
                    minecraft.setScreen(compact
                        ? new CompactGameForgeBrowserScreen()
                        : new GameForgeBrowserScreen());
                }
            }
        }
    }
}
