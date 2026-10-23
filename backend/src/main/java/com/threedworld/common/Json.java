package com.threedworld.common;

import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Helper JSON tĩnh (các cột *_json lưu dạng TEXT). */
public final class Json {
    public static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    static {
        // Scene 3D Studio có thể chứa mesh base64 lớn
        MAPPER.getFactory().setStreamReadConstraints(StreamReadConstraints.builder().maxStringLength(200_000_000).build());
    }

    private Json() {}

    public static String write(Object o) {
        try {
            return MAPPER.writeValueAsString(o);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static byte[] bytes(Object o) {
        try {
            return MAPPER.writeValueAsBytes(o);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static Object read(String s) {
        if (s == null) return null;
        try {
            return MAPPER.readValue(s, Object.class);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static Map<String, Object> map(String s) {
        if (s == null || s.isBlank()) return new LinkedHashMap<>();
        try {
            return MAPPER.readValue(s, new TypeReference<LinkedHashMap<String, Object>>() {});
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static List<Object> list(String s) {
        if (s == null || s.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(s, new TypeReference<ArrayList<Object>>() {});
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static JsonNode tree(byte[] bytes) {
        try {
            return MAPPER.readTree(bytes);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
